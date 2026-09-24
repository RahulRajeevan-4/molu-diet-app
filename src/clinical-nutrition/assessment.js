/**
 * Unified assessment: turns the shared form state into every dependent result.
 * Pure — the React hook only memoises this, so the whole dependency graph is
 * unit-testable.
 */
import { calculateBMI, classifyIndianBMI, assessWaistCircumference } from "./calculators/anthropometry.js";
import { calculateHarrisBenedict, calculateMifflinStJeor, calculateTEE } from "./calculators/energy.js";
import { calculateBrocaIBW, calculateBMIBasedIBW, calculateAdjustedBodyWeight } from "./calculators/bodyWeight.js";
import { calculateCurreriEnergy, getCurreriAgeGroup } from "./calculators/burns.js";
import { calculateEnergyBasedFluid, calculateBurnResuscitationFluid } from "./calculators/fluids.js";
import { failure, blocked, fmt } from "./utils/result.js";
import { parseNumberInput, checkNumber, POSITIVE } from "./utils/validation.js";
import { FORMULAS, FORMULA_REGISTRY_VERSION } from "./constants/formulas.js";
import { OBESITY_CATEGORY_IDS, BURN_ADULT_MIN_AGE_YEARS } from "./constants/thresholds.js";

export const NUMERIC_PATIENT_FIELDS = Object.freeze([
  "ageYears",
  "ageMonths",
  "weightKg",
  "heightCm",
  "waistCm",
  "usualWeightKg",
  "activityFactor",
  "stressFactor",
  "idealBmi",
  "tbsaPercent",
]);

/** Inline (per-field) rules. Missing values are not errors here — each calculator reports what it needs. */
const FIELD_RULES = {
  ageYears: ["Age", { min: 0, integer: true, max: 130 }],
  ageMonths: ["Additional months", { min: 0, max: 11, integer: true }],
  weightKg: ["Weight", POSITIVE],
  heightCm: ["Height", POSITIVE],
  waistCm: ["Waist circumference", POSITIVE],
  usualWeightKg: ["Usual body weight", POSITIVE],
  activityFactor: ["Activity factor", POSITIVE],
  stressFactor: ["Stress factor", POSITIVE],
  idealBmi: ["Ideal BMI", POSITIVE],
  tbsaPercent: ["Burn %TBSA", { min: 0, minExclusive: true, max: 100, unit: "%" }],
  manualWeightKg: ["Manual weight", POSITIVE],
  manualReeKcal: ["Measured REE", POSITIVE],
  manualIbwKg: ["Clinician-determined IBW", POSITIVE],
  rdaKcalPerDay: ["RDA", POSITIVE],
  manualEnergyKcal: ["Manual energy", POSITIVE],
};

export const BMR_SOURCES = Object.freeze({
  "harris-benedict": "Harris-Benedict",
  "mifflin-st-jeor": "Mifflin-St Jeor",
  manual: "Manual entry (e.g. measured REE)",
});

export const WEIGHT_BASES = Object.freeze({
  actual: "Actual body weight",
  "ibw-broca": "IBW — simple Broca",
  "ibw-bmi": "IBW — target BMI",
  adjusted: "Adjusted body weight",
  manual: "Manual weight",
});

export const IBW_SOURCES = Object.freeze({
  broca: "Simple Broca",
  bmi: "Target BMI",
  manual: "Clinician-determined",
});

export const ENERGY_SOURCES = Object.freeze({
  tee: "Total Energy Expenditure (TEE/TER)",
  curreri: "Burn energy estimate (Curreri)",
  manual: "Manual entry",
});

export function createInitialState(assessmentDate = "") {
  return {
    patient: {
      name: "",
      assessmentDate,
      ageYears: "",
      ageMonths: "",
      sex: "",
      weightKg: "",
      heightCm: "",
      waistCm: "",
      usualWeightKg: "",
      activityFactor: "",
      stressFactor: "",
      idealBmi: "",
      tbsaPercent: "",
    },
    selections: {
      bmrSource: "",
      hbVariant: "harris-benedict-rounded",
      energyWeightBasis: "actual",
      manualWeightKg: "",
      manualReeKcal: "",
      adjustedRequested: false,
      ibwSourceForAdjusted: "broca",
      manualIbwKg: "",
      curreriWeightBasis: "usual",
      applyTbsaCap: false,
      rdaKcalPerDay: "",
      injuryTime: "",
      energySourceForFluid: "",
      manualEnergyKcal: "",
    },
    notes: "",
  };
}

function parseAll(state) {
  const v = {};
  for (const f of NUMERIC_PATIENT_FIELDS) v[f] = parseNumberInput(state.patient[f]);
  for (const f of ["manualWeightKg", "manualReeKcal", "manualIbwKg", "rdaKcalPerDay", "manualEnergyKcal"]) {
    v[f] = parseNumberInput(state.selections[f]);
  }
  // Extra months only refine paediatric burn age groups; ignore them for adults
  // so a stale value can't leak into adult labels.
  if (v.ageYears !== null && v.ageYears >= BURN_ADULT_MIN_AGE_YEARS) v.ageMonths = null;
  v.sex = state.patient.sex || null;
  return v;
}

/** Invalid (not missing) values keyed by field, for inline messages. */
export function validateFields(values) {
  const out = {};
  for (const [field, [label, rules]] of Object.entries(FIELD_RULES)) {
    if (values[field] === null || values[field] === undefined) continue;
    const issue = checkNumber(values[field], field, label, rules);
    if (issue) out[field] = issue.message;
  }
  return out;
}

function resolveIbw(source, { broca, bmiIbw, manualIbwKg }) {
  if (source === "broca") return broca.ok ? { ok: true, value: broca.value, label: "Simple Broca IBW" } : broca;
  if (source === "bmi") return bmiIbw.ok ? { ok: true, value: bmiIbw.value, label: "Target-BMI IBW" } : bmiIbw;
  const issue = checkNumber(manualIbwKg, "manualIbwKg", "Clinician-determined IBW", POSITIVE);
  return issue ? failure([issue]) : { ok: true, value: manualIbwKg, label: "Clinician-determined IBW" };
}

function resolveWeightBasis(basis, { values, broca, bmiIbw, adjusted }) {
  const label = WEIGHT_BASES[basis];
  const pick = (r) => (r.ok ? { ok: true, value: r.value, basis, label } : failure(r.issues ?? [], { blocked: r.blocked }));
  switch (basis) {
    case "actual": {
      const issue = checkNumber(values.weightKg, "weightKg", "Weight", POSITIVE);
      return issue ? failure([issue]) : { ok: true, value: values.weightKg, basis, label };
    }
    case "ibw-broca":
      return pick(broca);
    case "ibw-bmi":
      return pick(bmiIbw);
    case "adjusted":
      return adjusted
        ? pick(adjusted)
        : blocked("Adjusted body weight has not been requested — enable it in Ideal & Adjusted Body Weight.");
    case "manual": {
      const issue = checkNumber(values.manualWeightKg, "manualWeightKg", "Manual weight", POSITIVE);
      return issue ? failure([issue]) : { ok: true, value: values.manualWeightKg, basis, label };
    }
    default:
      return blocked("Select a weight basis.");
  }
}

function parseInjuryTime(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {ReturnType<typeof createInitialState>} state
 * @param {{ now?: Date }} [options]
 */
export function computeAssessment(state, { now = new Date() } = {}) {
  const s = state.selections;
  const values = parseAll(state);
  const fieldErrors = validateFields(values);

  // Anthropometry
  const bmi = calculateBMI(values);
  const bmiClass = bmi.ok ? classifyIndianBMI(bmi.value, values.ageYears) : bmi;
  const waist = assessWaistCircumference(values);

  // Ideal & adjusted body weight
  const broca = calculateBrocaIBW(values);
  const bmiIbw = calculateBMIBasedIBW(values);
  const obesityIndicator = bmiClass.ok ? OBESITY_CATEGORY_IDS.includes(bmiClass.category.id) : null;
  const ibwForAdjusted = resolveIbw(s.ibwSourceForAdjusted, { broca, bmiIbw, manualIbwKg: values.manualIbwKg });
  let adjusted = null;
  if (s.adjustedRequested) {
    adjusted = ibwForAdjusted.ok
      ? {
          ...calculateAdjustedBodyWeight({ actualWeightKg: values.weightKg, idealWeightKg: ibwForAdjusted.value }),
          ibwLabel: ibwForAdjusted.label,
        }
      : ibwForAdjusted;
  }

  // Energy — BMR equations use the dietitian-selected weight basis
  const energyWeight = resolveWeightBasis(s.energyWeightBasis, { values, broca, bmiIbw, adjusted });
  const bmrInputs = { ...values, weightKg: energyWeight.ok ? energyWeight.value : null };
  // If the weight basis is unavailable, report that instead of a generic "Weight is required".
  const withWeightBasis = (r) =>
    energyWeight.ok || r.ok || r.blocked
      ? r
      : {
          ...r,
          issues: [...(energyWeight.issues ?? []), ...r.issues.filter((i) => i.field !== "weightKg")],
          ...(energyWeight.blocked ? { blocked: energyWeight.blocked } : {}),
        };
  const harrisBenedict = withWeightBasis(calculateHarrisBenedict({ ...bmrInputs, variant: s.hbVariant }));
  const mifflin = withWeightBasis(calculateMifflinStJeor(bmrInputs));

  let selectedBmr;
  if (s.bmrSource === "harris-benedict") selectedBmr = harrisBenedict;
  else if (s.bmrSource === "mifflin-st-jeor") selectedBmr = mifflin;
  else if (s.bmrSource === "manual") {
    const issue = checkNumber(values.manualReeKcal, "manualReeKcal", "Measured REE", POSITIVE);
    selectedBmr = issue
      ? failure([issue], { formulaId: "manual" })
      : { ok: true, value: values.manualReeKcal, unit: "kcal/day", formulaId: "manual", steps: [], warnings: [] };
  } else selectedBmr = blocked("Select a BMR/REE equation.");

  const tee = selectedBmr.ok
    ? calculateTEE({
        bmrKcalPerDay: selectedBmr.value,
        activityFactor: values.activityFactor,
        stressFactor: values.stressFactor,
      })
    : selectedBmr;

  // Burns
  const curreriWeight = s.curreriWeightBasis === "usual" ? values.usualWeightKg : values.weightKg;
  const curreri = calculateCurreriEnergy({
    ageYears: values.ageYears,
    ageMonths: values.ageMonths,
    weightKg: curreriWeight,
    weightBasis: s.curreriWeightBasis,
    tbsaPercent: values.tbsaPercent,
    rdaKcalPerDay: values.rdaKcalPerDay,
    applyTbsaCap: s.applyTbsaCap,
  });
  const curreriGroup =
    values.ageYears !== null && Number.isInteger(values.ageYears) && values.ageYears >= 0
      ? getCurreriAgeGroup(values.ageYears, Number.isInteger(values.ageMonths) ? values.ageMonths : null)
      : null;

  // Selected energy requirement (feeds fluid estimate + summary)
  let selectedEnergy;
  if (s.energySourceForFluid === "tee") selectedEnergy = tee;
  else if (s.energySourceForFluid === "curreri") selectedEnergy = curreri;
  else if (s.energySourceForFluid === "manual") {
    const issue = checkNumber(values.manualEnergyKcal, "manualEnergyKcal", "Manual energy", POSITIVE);
    selectedEnergy = issue
      ? failure([issue])
      : { ok: true, value: values.manualEnergyKcal, unit: "kcal/day", formulaId: "manual", steps: [], warnings: [] };
  } else selectedEnergy = blocked("Select which energy estimate to carry forward.");

  const energyFluid = selectedEnergy.ok
    ? calculateEnergyBasedFluid({ energyKcalPerDay: selectedEnergy.value })
    : selectedEnergy;
  const parkland = calculateBurnResuscitationFluid({
    weightKg: values.weightKg,
    tbsaPercent: values.tbsaPercent,
    ageYears: values.ageYears,
    injuryTime: parseInjuryTime(s.injuryTime),
    referenceTime: now,
  });

  return {
    values,
    fieldErrors,
    bmi,
    bmiClass,
    waist,
    broca,
    bmiIbw,
    obesityIndicator,
    ibwForAdjusted,
    adjusted,
    energyWeight,
    harrisBenedict,
    mifflin,
    selectedBmr,
    tee,
    curreri,
    curreriGroup,
    selectedEnergy,
    energyFluid,
    parkland,
  };
}

/** Results that appear in the summary / export, with the formula each used. */
function resultEntries(state, r) {
  const s = state.selections;
  return [
    ["BMI", r.bmi],
    ["Waist circumference", r.waist],
    ["Harris-Benedict BMR", r.harrisBenedict],
    ["Mifflin-St Jeor REE", r.mifflin],
    ["Simple Broca IBW", r.broca],
    ["Target-BMI IBW", r.bmiIbw],
    ...(s.adjustedRequested ? [["Adjusted body weight", r.adjusted]] : []),
    ["TEE/TER", r.tee],
    ["Burn energy (Curreri)", r.curreri],
    ["Energy-based fluid", r.energyFluid],
    ["Burn resuscitation fluid (first 24 h)", r.parkland],
  ];
}

/**
 * Reproducible snapshot: inputs, selections, formula ids/versions and outputs.
 * Suitable for attaching to a patient record once the app has one.
 */
export function buildAssessmentRecord(state, r, { generatedAt = new Date() } = {}) {
  const results = {};
  for (const [label, res] of resultEntries(state, r)) {
    if (!res?.ok) continue;
    const f = FORMULAS[res.formulaId];
    results[label] = {
      formulaId: res.formulaId,
      formulaVersion: f?.version ?? "manual",
      value: res.value,
      unit: res.unit,
      inputs: res.inputs,
    };
  }
  if (r.bmiClass.ok) {
    results["Indian BMI classification"] = {
      formulaId: r.bmiClass.formulaId,
      formulaVersion: FORMULAS[r.bmiClass.formulaId].version,
      category: r.bmiClass.category.label,
    };
  }
  return {
    schema: "clinical-nutrition-assessment/1",
    formulaRegistryVersion: FORMULA_REGISTRY_VERSION,
    generatedAt: generatedAt.toISOString(),
    disclaimer: "All values are estimates for clinical decision support, not prescriptions.",
    patient: { ...state.patient, ageMonths: r.values.ageMonths ?? "" },
    selections: { ...state.selections, energyWeightBasisValueKg: r.energyWeight.ok ? r.energyWeight.value : null },
    results,
    notes: state.notes,
  };
}

/** Plain-text summary for clipboard. */
export function buildSummaryText(state, r) {
  const p = state.patient;
  const lines = ["CLINICAL NUTRITION ASSESSMENT — ESTIMATES, NOT PRESCRIPTIONS"];
  if (p.name) lines.push(`Patient: ${p.name}`);
  if (p.assessmentDate) lines.push(`Date: ${p.assessmentDate}`);
  const demo = [
    p.ageYears && `Age ${p.ageYears} y${r.values.ageMonths ? ` ${r.values.ageMonths} m` : ""}`,
    p.sex && `Sex (equation) ${p.sex}`,
    p.weightKg && `Weight ${p.weightKg} kg`,
    p.heightCm && `Height ${p.heightCm} cm`,
    p.waistCm && `Waist ${p.waistCm} cm`,
  ].filter(Boolean);
  if (demo.length) lines.push(demo.join(" · "));
  lines.push("");
  for (const [label, res] of resultEntries(state, r)) {
    if (!res?.ok) continue;
    const f = FORMULAS[res.formulaId];
    let line = `${label}: ${fmt(res.value, res.unit === "kg/m²" ? 2 : res.unit === "kg" ? 1 : 0)} ${res.unit}`;
    if (label === "BMI" && r.bmiClass.ok) line += ` — ${r.bmiClass.category.label} (Indian adult cut-offs)`;
    if (label === "Waist circumference") line += ` — ${res.atOrAbove ? "at or above" : "below"} ${res.thresholdCm} cm cut-off`;
    if (f) line += ` [${f.name}, ${f.version}]`;
    lines.push(line);
  }
  if (r.energyWeight.ok) lines.push(`Weight basis for BMR equations: ${r.energyWeight.label} (${fmt(r.energyWeight.value, 1)} kg)`);
  if (r.selectedEnergy.ok) lines.push(`Selected estimated energy requirement: ${fmt(r.selectedEnergy.value, 0)} kcal/day (${ENERGY_SOURCES[state.selections.energySourceForFluid]})`);
  if (state.notes.trim()) lines.push("", `Notes: ${state.notes.trim()}`);
  return lines.join("\n");
}
