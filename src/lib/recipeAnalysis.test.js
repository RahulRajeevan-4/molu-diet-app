import { describe, it, expect } from "vitest";
import { analyzeRecipe, contributionsFor, DAILY_VALUES } from "./recipeAnalysis.js";

const empty = { energy_kcal: null, carbohydrate_g: null, sugars_g: null, fiber_g: null, protein_g: null, fat_g: null, potassium_mg: null, vitamin_c_mg: null };
const row = (id, fruitName, grams, values) => ({ id, fruitName, grams, values: { ...empty, ...values } });

// 200 g mango + 120 g banana (rounded per-100 g style values, already scaled to grams)
const mango = row(1, "Mango", 200, { energy_kcal: 120, carbohydrate_g: 30, sugars_g: 27, fiber_g: 3.2, protein_g: 1.6, fat_g: 0.8, potassium_mg: 336, vitamin_c_mg: 72 });
const banana = row(2, "Banana", 120, { energy_kcal: 107, carbohydrate_g: 27, sugars_g: 14.7, fiber_g: 3.1, protein_g: 1.3, fat_g: 0.4, potassium_mg: 430, vitamin_c_mg: 10 });
const noData = row(3, "Mabolo / Velvet Apple", 80, {});

describe("analyzeRecipe", () => {
  it("returns an empty-safe summary", () => {
    const o = analyzeRecipe([], 1);
    expect(o.totalGrams).toBe(0);
    expect(o.macroEnergy).toBeNull();
    expect(o.dailyValues).toEqual([]);
    expect(o.insights).toEqual([]);
  });

  it("totals and per-serving values", () => {
    const o = analyzeRecipe([mango, banana], 2);
    expect(o.totalGrams).toBe(320);
    expect(o.gramsPerServing).toBe(160);
    expect(o.totals.energy_kcal).toBeCloseTo(227, 6);
    expect(o.perServing.energy_kcal).toBeCloseTo(113.5, 6);
    expect(o.energyDensity).toBeCloseTo((227 / 320) * 100, 6);
  });

  it("splits energy by Atwater factors and the shares sum to 100", () => {
    const o = analyzeRecipe([mango, banana], 1);
    const [carb, protein, fat] = o.macroEnergy.segments;
    expect(carb.kcal).toBeCloseTo(57 * 4, 6);
    expect(protein.kcal).toBeCloseTo(2.9 * 4, 6);
    expect(fat.kcal).toBeCloseTo(1.2 * 9, 6);
    expect(o.macroEnergy.segments.reduce((s, x) => s + x.share, 0)).toBeCloseTo(100, 6);
    expect(o.macroEnergy.sugarShare).toBeCloseTo((41.7 * 4 * 100) / o.macroEnergy.kcal, 6);
  });

  it("computes %DV per serving with FDA thresholds", () => {
    const o = analyzeRecipe([mango, banana], 2);
    const vitC = o.dailyValues.find((d) => d.key === "vitamin_c_mg");
    expect(vitC.pct).toBeCloseTo((41 / DAILY_VALUES.vitamin_c_mg) * 100, 6);
    expect(vitC.level).toBe("high");
    const protein = o.dailyValues.find((d) => d.key === "protein_g");
    expect(protein.level).toBeNull();
    // Claim wording is not applied to carbohydrate or fat, even above 10% DV.
    const heavy = analyzeRecipe([row(8, "Avocado", 500, { carbohydrate_g: 60, fat_g: 40 })], 1);
    expect(heavy.dailyValues.find((d) => d.key === "carbohydrate_g").pct).toBeGreaterThan(20);
    expect(heavy.dailyValues.find((d) => d.key === "carbohydrate_g").level).toBeNull();
    expect(heavy.dailyValues.find((d) => d.key === "fat_g").level).toBeNull();
    expect(o.dailyValues.find((d) => d.key === "sugars_g")).toBeUndefined();
  });

  it("reports data coverage and warns about missing ingredients", () => {
    const o = analyzeRecipe([mango, noData], 1);
    expect(o.coverage.withData).toBe(1);
    expect(o.coverage.gramsShare).toBeCloseTo((200 / 280) * 100, 6);
    expect(o.coverage.missing).toEqual(["Mabolo / Velvet Apple"]);
    expect(o.insights[0]).toMatchObject({ id: "coverage", tone: "caution" });
    // energy density uses only the grams that have energy data
    expect(o.energyDensity).toBeCloseTo(60, 6);
  });

  it("shortens long missing-data lists", () => {
    const rows = ["A", "B", "C", "D", "E"].map((n, i) => row(10 + i, n, 10, {}));
    const o = analyzeRecipe([mango, ...rows], 1);
    expect(o.insights[0].text).toBe("No nutrient data for A, B, C and 2 more, so totals are underestimates.");
  });

  it("notes provisional vegetable values only when they contribute data", () => {
    const carrot = { ...row(20, "Carrot", 50, { energy_kcal: 20.5 }), provisional: true };
    const turmeric = { ...row(21, "Fresh Turmeric", 5, {}), provisional: true };
    expect(analyzeRecipe([mango, carrot], 1).insights.some((i) => i.id === "provisional")).toBe(true);
    expect(analyzeRecipe([mango, turmeric], 1).insights.some((i) => i.id === "provisional")).toBe(false);
  });

  it("flags high potassium as a caution with a text label", () => {
    const o = analyzeRecipe([banana, row(4, "Banana", 300, { potassium_mg: 1075 })], 1);
    expect(o.insights.find((i) => i.id === "potassium-caution")?.tone).toBe("caution");
  });

  it("skips the fibre-to-sugar ratio when there is no fibre", () => {
    const o = analyzeRecipe([row(5, "Lime", 30, { sugars_g: 1, fiber_g: 0 })], 1);
    expect(o.insights.find((i) => i.id === "fibre-sugar")).toBeUndefined();
  });

  it("returns no macro split when a macro is missing everywhere", () => {
    const o = analyzeRecipe([row(6, "X", 100, { carbohydrate_g: 10, protein_g: 1 })], 1);
    expect(o.macroEnergy).toBeNull();
  });
});

describe("contributionsFor", () => {
  it("merges duplicate ingredients, sorts largest first and puts missing data last", () => {
    const extra = row(7, "Banana", 60, { energy_kcal: 53.5 });
    const list = contributionsFor([banana, noData, mango, extra], "energy_kcal");
    expect(list.map((c) => c.name)).toEqual(["Banana", "Mango", "Mabolo / Velvet Apple"]);
    expect(list[0].value).toBeCloseTo(160.5, 6);
    expect(list[0].grams).toBe(180);
    expect(list[0].share).toBeCloseTo((160.5 / 280.5) * 100, 6);
    expect(list[2].value).toBeNull();
    expect(list[2].share).toBeNull();
  });
});
