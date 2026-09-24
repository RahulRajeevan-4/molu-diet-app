import { describe, it, expect } from "vitest";
import { parseNumberInput, checkNumber } from "../utils/validation.js";
import { calculateBMI, classifyIndianBMI, assessWaistCircumference, cmToM } from "../calculators/anthropometry.js";
import { calculateHarrisBenedict, calculateMifflinStJeor, calculateTEE } from "../calculators/energy.js";
import { calculateBrocaIBW, calculateBMIBasedIBW, calculateAdjustedBodyWeight } from "../calculators/bodyWeight.js";
import { calculateCurreriEnergy, getCurreriAgeGroup } from "../calculators/burns.js";
import { calculateEnergyBasedFluid, calculateBurnResuscitationFluid } from "../calculators/fluids.js";
import { FORMULAS } from "../constants/formulas.js";

const adultF = { sex: "female", weightKg: 70, heightCm: 160, ageYears: 35 };
const adultM = { sex: "male", weightKg: 80, heightCm: 175, ageYears: 40 };

describe("input parsing and validation", () => {
  it("treats blank as missing, not zero", () => {
    expect(parseNumberInput("")).toBeNull();
    expect(parseNumberInput("   ")).toBeNull();
    expect(parseNumberInput(null)).toBeNull();
    expect(parseNumberInput("0")).toBe(0);
  });
  it("maps non-numeric and non-finite input to NaN", () => {
    expect(parseNumberInput("abc")).toBeNaN();
    expect(parseNumberInput("Infinity")).toBeNaN();
    expect(parseNumberInput(Infinity)).toBeNaN();
  });
  it("distinguishes missing from invalid", () => {
    expect(checkNumber(null, "w", "Weight").kind).toBe("missing");
    expect(checkNumber(NaN, "w", "Weight").kind).toBe("invalid");
    expect(checkNumber(-1, "w", "Weight", { min: 0, minExclusive: true }).kind).toBe("invalid");
  });
});

describe("BMI", () => {
  it("converts cm to m and matches the worked example (70 kg, 170 cm → 24.22)", () => {
    const r = calculateBMI({ weightKg: 70, heightCm: 170 });
    expect(r.ok).toBe(true);
    expect(r.value).toBeCloseTo(24.2215, 4);
    expect(r.unit).toBe("kg/m²");
    expect(r.heightM).toBe(1.7);
  });
  it("does not use centimetres directly (would give ~0.0024)", () => {
    const r = calculateBMI({ weightKg: 70, heightCm: 170 });
    expect(r.value).toBeGreaterThan(10);
    expect(cmToM(170)).toBe(1.7);
  });
  it.each([
    [{ weightKg: null, heightCm: 170 }, "weightKg"],
    [{ weightKg: 70, heightCm: null }, "heightCm"],
    [{ weightKg: 70, heightCm: 0 }, "heightCm"],
    [{ weightKg: -5, heightCm: 170 }, "weightKg"],
    [{ weightKg: NaN, heightCm: 170 }, "weightKg"],
  ])("refuses to calculate with %o", (input, field) => {
    const r = calculateBMI(input);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toContain(field);
  });
  it("warns when height looks like metres", () => {
    const r = calculateBMI({ weightKg: 70, heightCm: 1.7 });
    expect(r.warnings.join(" ")).toMatch(/metres/);
  });
});

describe("Indian BMI classification", () => {
  const cls = (bmi) => classifyIndianBMI(bmi, 30).category.id;
  it.each([
    [18.49, "underweight"],
    [18.5, "normal"],
    [22.9, "normal"],
    [22.95, "normal"], // between displayed ranges → still Normal (unrounded < 23)
    [22.9999, "normal"],
    [23, "overweight"],
    [24.99, "overweight"],
    [25, "obesity-1"],
    [29.99, "obesity-1"],
    [30, "obesity-2"],
    [45, "obesity-2"],
  ])("BMI %f → %s", (bmi, id) => {
    expect(cls(bmi)).toBe(id);
  });
  it("uses the unrounded value (24.996 is Overweight, not Obesity I)", () => {
    expect(cls(24.996)).toBe("overweight");
  });
  it("is not applied to children", () => {
    const r = classifyIndianBMI(24, 12);
    expect(r.ok).toBe(false);
    expect(r.blocked).toMatch(/under 18/);
  });
  it("requires age", () => {
    expect(classifyIndianBMI(24, null).ok).toBe(false);
  });
  it("returns data only, no presentation", () => {
    const r = classifyIndianBMI(24, 30);
    expect(r.category).not.toHaveProperty("color");
  });
});

describe("Harris-Benedict (requested rounded)", () => {
  it("male: 66.5 + 13.7W + 5H − 6.7A", () => {
    const r = calculateHarrisBenedict(adultM);
    expect(r.value).toBeCloseTo(66.5 + 13.7 * 80 + 5 * 175 - 6.7 * 40, 6); // 1769.5
    expect(r.value).toBeCloseTo(1769.5, 6);
    expect(r.unit).toBe("kcal/day");
    expect(r.formulaId).toBe("harris-benedict-rounded");
  });
  it("female: 655.1 + 9.6W + 1.8H − 4.6A", () => {
    const r = calculateHarrisBenedict(adultF);
    expect(r.value).toBeCloseTo(655.1 + 9.6 * 70 + 1.8 * 160 - 4.6 * 35, 6); // 1454.1
    expect(r.value).toBeCloseTo(1454.1, 6);
  });
  it("keeps the original 1919 coefficients as a separate variant", () => {
    const r = calculateHarrisBenedict({ ...adultF, variant: "harris-benedict-1919" });
    expect(r.value).toBeCloseTo(655.0955 + 9.5634 * 70 + 1.8496 * 160 - 4.6756 * 35, 6);
    expect(r.formulaId).toBe("harris-benedict-1919");
  });
  it("is blocked for patients under 18", () => {
    expect(calculateHarrisBenedict({ ...adultF, ageYears: 17 }).blocked).toBeTruthy();
    expect(calculateHarrisBenedict({ ...adultF, ageYears: 18 }).ok).toBe(true);
  });
  it("requires sex", () => {
    expect(calculateHarrisBenedict({ ...adultF, sex: null }).ok).toBe(false);
  });
});

describe("Mifflin-St Jeor", () => {
  it("male: 10W + 6.25H − 5A + 5", () => {
    expect(calculateMifflinStJeor(adultM).value).toBeCloseTo(800 + 1093.75 - 200 + 5, 6); // 1698.75
  });
  it("female uses −161, not +161", () => {
    const r = calculateMifflinStJeor(adultF);
    expect(r.value).toBeCloseTo(700 + 1000 - 175 - 161, 6); // 1364
    expect(r.value).not.toBeCloseTo(700 + 1000 - 175 + 161, 0);
    expect(FORMULAS["mifflin-st-jeor"].coefficients.sexConstant.female).toBe(-161);
  });
  it("is blocked for children", () => {
    expect(calculateMifflinStJeor({ ...adultF, ageYears: 10 }).blocked).toMatch(/Adult/);
  });
});

describe("TEE", () => {
  it("multiplies BMR × activity × stress", () => {
    const r = calculateTEE({ bmrKcalPerDay: 1500, activityFactor: 1.2, stressFactor: 1.3 });
    expect(r.value).toBeCloseTo(2340, 6);
    expect(r.unit).toBe("kcal/day");
  });
  it("has no default factors", () => {
    const r = calculateTEE({ bmrKcalPerDay: 1500, activityFactor: null, stressFactor: null });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field).sort()).toEqual(["activityFactor", "stressFactor"]);
  });
  it("rejects zero / negative factors", () => {
    expect(calculateTEE({ bmrKcalPerDay: 1500, activityFactor: 0, stressFactor: 1 }).ok).toBe(false);
    expect(calculateTEE({ bmrKcalPerDay: 1500, activityFactor: 1, stressFactor: -1 }).ok).toBe(false);
  });
});

describe("Ideal body weight", () => {
  it("simple Broca uses centimetres: 170 cm → 70 kg", () => {
    const r = calculateBrocaIBW({ heightCm: 170, ageYears: 30 });
    expect(r.value).toBe(70);
    expect(r.unit).toBe("kg");
  });
  it("Broca does not accept metres silently (1.7 → not defined)", () => {
    expect(calculateBrocaIBW({ heightCm: 1.7, ageYears: 30 }).ok).toBe(false);
  });
  it("Broca is adult-only", () => {
    expect(calculateBrocaIBW({ heightCm: 150, ageYears: 12 }).blocked).toBeTruthy();
  });
  it("target-BMI IBW = BMI × m²", () => {
    const r = calculateBMIBasedIBW({ idealBmi: 22, heightCm: 160 });
    expect(r.value).toBeCloseTo(22 * 1.6 * 1.6, 8); // 56.32
  });
  it("target-BMI IBW requires an explicit ideal BMI", () => {
    const r = calculateBMIBasedIBW({ idealBmi: null, heightCm: 160 });
    expect(r.ok).toBe(false);
    expect(r.issues[0].field).toBe("idealBmi");
  });
});

describe("Adjusted body weight", () => {
  it("IBW + 0.25 × (actual − IBW)", () => {
    const r = calculateAdjustedBodyWeight({ actualWeightKg: 110, idealWeightKg: 70 });
    expect(r.value).toBeCloseTo(80, 8);
  });
  it("warns when actual < IBW", () => {
    const r = calculateAdjustedBodyWeight({ actualWeightKg: 60, idealWeightKg: 70 });
    expect(r.value).toBeCloseTo(67.5, 8);
    expect(r.warnings.length).toBe(1);
  });
});

describe("Curreri — adult", () => {
  it("25 × UBW + 40 × %TBSA", () => {
    const r = calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: 30 });
    expect(r.value).toBe(25 * 70 + 40 * 30); // 2950
    expect(r.formulaId).toBe("curreri-adult");
    expect(r.effectiveTbsaPercent).toBe(30);
  });
  it("applies the 50 % cap only when selected", () => {
    const uncapped = calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: 60 });
    const capped = calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: 60, applyTbsaCap: true });
    expect(uncapped.value).toBe(1750 + 2400);
    expect(capped.value).toBe(1750 + 2000);
    expect(capped.tbsaPercent).toBe(60);
    expect(capped.effectiveTbsaPercent).toBe(50);
    expect(capped.capApplied).toBe(true);
  });
  it("cap has no effect at or below 50 %", () => {
    const r = calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: 50, applyTbsaCap: true });
    expect(r.effectiveTbsaPercent).toBe(50);
    expect(r.capApplied).toBe(false);
  });
  it("age boundaries 16 and 59 are adult", () => {
    expect(calculateCurreriEnergy({ ageYears: 16, weightKg: 60, tbsaPercent: 10 }).formulaId).toBe("curreri-adult");
    expect(calculateCurreriEnergy({ ageYears: 59, weightKg: 60, tbsaPercent: 10 }).formulaId).toBe("curreri-adult");
  });
  it.each([0, -5, 101, null])("rejects %TBSA %s", (tbsa) => {
    expect(calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: tbsa }).ok).toBe(false);
  });
  it("accepts 100 % TBSA", () => {
    expect(calculateCurreriEnergy({ ageYears: 30, weightKg: 70, tbsaPercent: 100 }).ok).toBe(true);
  });
});

describe("Curreri — age ≥ 60 (unconfirmed)", () => {
  it("is disabled while the coefficient is unconfirmed", () => {
    const r = calculateCurreriEnergy({ ageYears: 60, weightKg: 70, tbsaPercent: 20 });
    expect(r.ok).toBe(false);
    expect(r.blocked).toMatch(/confirm/);
    expect(FORMULAS["curreri-elderly"].status).toBe("requires-confirmation");
  });
  it("computes once a protocol is confirmed in the registry", () => {
    const confirmed = {
      ...FORMULAS,
      "curreri-elderly": { ...FORMULAS["curreri-elderly"], status: "approved", coefficients: { perKg: 20, perTbsa: 65 } },
    };
    const r = calculateCurreriEnergy({ ageYears: 70, weightKg: 60, tbsaPercent: 20, formulas: confirmed });
    expect(r.value).toBe(20 * 60 + 65 * 20);
  });
});

describe("Curreri Junior — paediatric", () => {
  it.each([
    [0, 0, "infant", 15],
    [0, 11, "infant", 15],
    [1, 0, "toddler", 25], // exactly 1 year → 1–3 group, not both
    [3, 11, "toddler", 25], // 3 y 11 m: no gap between 3 and 4
    [4, 0, "child", 40],
    [15, 11, "child", 40],
  ])("%i y %i m → %s (k=%i)", (y, m, id, k) => {
    const r = calculateCurreriEnergy({ ageYears: y, ageMonths: m, tbsaPercent: 20, rdaKcalPerDay: 1000 });
    expect(r.ageGroup.id).toBe(id);
    expect(r.value).toBe(1000 + k * 20);
  });
  it("16 years switches to the adult formula", () => {
    expect(getCurreriAgeGroup(16, 0).formulaId).toBe("curreri-adult");
    expect(getCurreriAgeGroup(15, 11).formulaId).toBe("curreri-junior");
  });
  it("prevents calculation without an RDA", () => {
    const r = calculateCurreriEnergy({ ageYears: 5, tbsaPercent: 20, rdaKcalPerDay: null });
    expect(r.ok).toBe(false);
    expect(r.issues[0].field).toBe("rdaKcalPerDay");
  });
  it("warns when the RDA looks like kcal/kg", () => {
    const r = calculateCurreriEnergy({ ageYears: 5, tbsaPercent: 20, rdaKcalPerDay: 90 });
    expect(r.warnings.join(" ")).toMatch(/per-kg/);
  });
  it("does not apply the adult TBSA cap", () => {
    const r = calculateCurreriEnergy({ ageYears: 5, tbsaPercent: 60, rdaKcalPerDay: 1500, applyTbsaCap: true });
    expect(r.value).toBe(1500 + 40 * 60);
    expect(r.capApplied).toBe(false);
  });
  it("rejects fractional years and out-of-range months", () => {
    expect(calculateCurreriEnergy({ ageYears: 2.5, tbsaPercent: 20, rdaKcalPerDay: 1000 }).ok).toBe(false);
    expect(calculateCurreriEnergy({ ageYears: 2, ageMonths: 12, tbsaPercent: 20, rdaKcalPerDay: 1000 }).ok).toBe(false);
  });
});

describe("Fluids", () => {
  it("energy-based: 1 mL/kcal (2000 kcal → 2000 mL)", () => {
    const r = calculateEnergyBasedFluid({ energyKcalPerDay: 2000 });
    expect(r.value).toBe(2000);
    expect(r.unit).toBe("mL/day");
    expect(r.litres).toBe(2);
  });
  it("energy-based requires an energy value", () => {
    expect(calculateEnergyBasedFluid({ energyKcalPerDay: null }).ok).toBe(false);
  });
  it("Parkland-type: 4 × kg × %TBSA with 50/50 split", () => {
    const r = calculateBurnResuscitationFluid({ weightKg: 70, tbsaPercent: 30, ageYears: 30 });
    expect(r.value).toBe(8400);
    expect(r.litres).toBeCloseTo(8.4, 10);
    expect(r.firstPhaseMl).toBe(4200);
    expect(r.secondPhaseMl).toBe(4200);
    expect(r.unit).toBe("mL");
  });
  it("Parkland-type is not extrapolated to children", () => {
    const r = calculateBurnResuscitationFluid({ weightKg: 20, tbsaPercent: 20, ageYears: 8 });
    expect(r.ok).toBe(false);
    expect(r.blocked).toMatch(/children/);
  });
  it("timing windows are measured from injury, not assessment", () => {
    const injury = new Date("2026-09-24T02:00:00Z");
    const now = new Date("2026-09-24T12:00:00Z"); // 10 h after injury
    const r = calculateBurnResuscitationFluid({ weightKg: 70, tbsaPercent: 30, ageYears: 30, injuryTime: injury, referenceTime: now });
    expect(r.timing.firstPhaseEnds.toISOString()).toBe("2026-09-24T10:00:00.000Z");
    expect(r.timing.windowEnds.toISOString()).toBe("2026-09-25T02:00:00.000Z");
    expect(r.timing.hoursSinceInjury).toBe(10);
    expect(r.warnings.join(" ")).toMatch(/first 8 h/);
  });
});

describe("Waist circumference (Indian adult cut-offs)", () => {
  it.each([
    ["male", 89.9, false],
    ["male", 90, true],
    ["male", 94, true],
    ["female", 79.9, false],
    ["female", 80, true],
  ])("%s %f cm → at/above: %s", (sex, waistCm, atOrAbove) => {
    const r = assessWaistCircumference({ sex, waistCm, ageYears: 35 });
    expect(r.atOrAbove).toBe(atOrAbove);
    expect(r.thresholdCm).toBe(sex === "male" ? 90 : 80);
  });
  it("requires sex and is adult-only", () => {
    expect(assessWaistCircumference({ sex: null, waistCm: 90, ageYears: 35 }).ok).toBe(false);
    expect(assessWaistCircumference({ sex: "male", waistCm: 90, ageYears: 10 }).blocked).toBeTruthy();
  });
});
