import { NUTRIENT_FIELDS } from "./nutrients.js";

/**
 * FDA Daily Values for adults and children ≥ 4 years (21 CFR 101.9, 2016 rule),
 * used as a common per-serving reference. Total sugars have no DV.
 */
export const DAILY_VALUES = Object.freeze({
  carbohydrate_g: 275,
  fiber_g: 28,
  protein_g: 50,
  fat_g: 78,
  potassium_mg: 4700,
  vitamin_c_mg: 90,
});

/** FDA nutrient-content claim thresholds, as % DV. */
export const DV_HIGH = 20;
export const DV_GOOD = 10;
/** "High" / "good source" wording only suits nutrients to encourage — not carbohydrate or fat. */
export const CLAIM_KEYS = Object.freeze(["fiber_g", "protein_g", "potassium_mg", "vitamin_c_mg"]);

/** General Atwater factors, kcal per gram. */
export const ATWATER = Object.freeze({ carbohydrate_g: 4, protein_g: 4, fat_g: 9 });

export const MACROS = Object.freeze([
  { key: "carbohydrate_g", label: "Carbohydrate" },
  { key: "protein_g", label: "Protein" },
  { key: "fat_g", label: "Fat" },
]);

const FIELD = Object.fromEntries(NUTRIENT_FIELDS.map((f) => [f.key, f]));
const INSIGHT_LABEL = { fiber_g: "fibre", potassium_mg: "potassium", vitamin_c_mg: "vitamin C", protein_g: "protein" };

function hasAnyValue(row) {
  return Object.values(row.values).some((v) => v != null);
}

function pct(part, whole) {
  return whole > 0 ? (part / whole) * 100 : null;
}

/** Per-ingredient contribution to one nutrient, merged by ingredient name, largest first. */
export function contributionsFor(rows, key) {
  const byName = new Map();
  for (const row of rows) {
    const entry = byName.get(row.fruitName) ?? { name: row.fruitName, grams: 0, value: null };
    entry.grams += row.grams;
    const v = row.values[key];
    if (v != null) entry.value = (entry.value ?? 0) + v;
    byName.set(row.fruitName, entry);
  }
  const list = [...byName.values()];
  const total = list.reduce((s, e) => s + (e.value ?? 0), 0);
  return list
    .map((e) => ({ ...e, share: e.value == null ? null : pct(e.value, total) }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}

/**
 * Summarises a recipe for the overview charts. `rows` are the Recipe Builder's
 * computed rows ({ fruitName, grams, values: { [nutrientKey]: number|null } }).
 */
export function analyzeRecipe(rows, servings = 1) {
  const n = Math.max(1, Number(servings) || 1);
  const totalGrams = rows.reduce((s, r) => s + r.grams, 0);
  const withData = rows.filter(hasAnyValue);
  const gramsWithData = withData.reduce((s, r) => s + r.grams, 0);
  const missing = [...new Set(rows.filter((r) => !hasAnyValue(r)).map((r) => r.fruitName))];

  const totals = {};
  for (const f of NUTRIENT_FIELDS) {
    const vals = rows.map((r) => r.values[f.key]).filter((v) => v != null);
    totals[f.key] = vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }
  const perServing = Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, v == null ? null : v / n])
  );

  const energyGrams = rows.filter((r) => r.values.energy_kcal != null).reduce((s, r) => s + r.grams, 0);
  const energyDensity = totals.energy_kcal != null && energyGrams > 0 ? (totals.energy_kcal / energyGrams) * 100 : null;

  let macroEnergy = null;
  if (MACROS.every((m) => totals[m.key] != null)) {
    const segments = MACROS.map((m) => ({ ...m, kcal: totals[m.key] * ATWATER[m.key] }));
    const kcal = segments.reduce((s, x) => s + x.kcal, 0);
    if (kcal > 0) {
      macroEnergy = {
        kcal,
        segments: segments.map((s) => ({ ...s, share: pct(s.kcal, kcal) })),
        sugarShare: totals.sugars_g != null ? pct(totals.sugars_g * 4, kcal) : null,
      };
    }
  }

  const dailyValues = Object.entries(DAILY_VALUES)
    .filter(([key]) => perServing[key] != null)
    .map(([key, dv]) => {
      const p = pct(perServing[key], dv);
      return {
        key,
        label: FIELD[key].label,
        unit: FIELD[key].unit,
        perServing: perServing[key],
        dv,
        pct: p,
        level: !CLAIM_KEYS.includes(key) ? null : p >= DV_HIGH ? "high" : p >= DV_GOOD ? "good" : null,
      };
    });

  const overview = {
    servings: n,
    ingredientCount: new Set(rows.map((r) => r.fruitName)).size,
    totalGrams,
    gramsPerServing: totalGrams / n,
    coverage: {
      withData: new Set(withData.map((r) => r.fruitName)).size,
      gramsShare: pct(gramsWithData, totalGrams),
      missing,
    },
    totals,
    perServing,
    energyDensity,
    macroEnergy,
    dailyValues,
  };
  overview.insights = buildInsights(rows, overview);
  return overview;
}

function round(v, dp = 0) {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

/** Short, factual observations. `tone: "caution"` items always carry a text label, never colour alone. */
function buildInsights(rows, o) {
  const out = [];
  if (!rows.length) return out;

  if (o.coverage.missing.length) {
    const names = o.coverage.missing;
    const list = names.length > 3 ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more` : names.join(", ");
    out.push({
      id: "coverage",
      tone: "caution",
      text: `No nutrient data for ${list}, so totals are underestimates.`,
    });
  }

  const provisional = [...new Set(rows.filter((r) => r.provisional && hasAnyValue(r)).map((r) => r.fruitName))];
  if (provisional.length) {
    out.push({
      id: "provisional",
      tone: "caution",
      text: `Vegetable values are provisional reference values (${provisional.length === 1 ? provisional[0] : `${provisional.length} ingredients`}) — verify before clinical use.`,
    });
  }

  const energy = contributionsFor(rows, "energy_kcal").filter((c) => c.value != null);
  if (energy.length > 1 && energy[0].share >= 40) {
    out.push({
      id: "top-energy",
      tone: "info",
      text: `${energy[0].name} supplies ${round(energy[0].share)}% of the energy.`,
    });
  }

  const sources = o.dailyValues
    .filter((d) => d.level)
    .sort((a, b) => b.pct - a.pct);
  for (const d of sources.slice(0, 2)) {
    const top = contributionsFor(rows, d.key).find((c) => c.value != null);
    out.push({
      id: `dv-${d.key}`,
      tone: "info",
      text: `${d.level === "high" ? "High in" : "Good source of"} ${INSIGHT_LABEL[d.key]}: ${round(d.pct)}% DV per serving${top ? `, mostly from ${top.name}` : ""}.`,
    });
  }

  const potassium = o.dailyValues.find((d) => d.key === "potassium_mg");
  if (potassium?.level === "high") {
    out.push({
      id: "potassium-caution",
      tone: "caution",
      text: `${round(potassium.perServing)} mg potassium per serving — review for patients on a potassium restriction (e.g. advanced CKD).`,
    });
  }

  const fibre = o.perServing.fiber_g;
  const sugars = o.perServing.sugars_g;
  if (fibre > 0 && sugars > 0) {
    out.push({
      id: "fibre-sugar",
      tone: "info",
      text: `Fibre-to-sugar ratio is 1 : ${round(sugars / fibre, 1)} (${round(fibre, 1)} g fibre, ${round(sugars, 1)} g sugars per serving).`,
    });
  }
  return out;
}
