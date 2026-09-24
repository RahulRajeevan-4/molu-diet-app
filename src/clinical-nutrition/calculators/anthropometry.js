import { success, failure, blocked, fmt } from "../utils/result.js";
import { checkNumber, checkOption, collectIssues, POSITIVE } from "../utils/validation.js";
import {
  ADULT_MIN_AGE_YEARS,
  INDIAN_BMI_CATEGORIES,
  INDIAN_WAIST_CUTOFF_CM,
  PLAUSIBLE,
  SEXES,
} from "../constants/thresholds.js";

/** cm → m. Kept as a named helper so the unit conversion is explicit and testable. */
export function cmToM(heightCm) {
  return heightCm / 100;
}

/** Soft warnings for values that look like unit-entry errors. Never blocks. */
export function heightWarnings(heightCm) {
  if (heightCm < 3) return [`Height ${fmt(heightCm)} cm looks like metres — height must be entered in centimetres.`];
  if (heightCm < PLAUSIBLE.heightCm.min || heightCm > PLAUSIBLE.heightCm.max) {
    return [`Height ${fmt(heightCm)} cm is outside the usual range — please check.`];
  }
  return [];
}

export function weightWarnings(weightKg, label = "Weight") {
  if (weightKg < PLAUSIBLE.weightKg.min || weightKg > PLAUSIBLE.weightKg.max) {
    return [`${label} ${fmt(weightKg)} kg is outside the usual range — please check.`];
  }
  return [];
}

/** Adult-age gate shared by adult-only formulas. Returns a CalcFailure or null. */
export function requireAdult(ageYears, formulaId, minAge = ADULT_MIN_AGE_YEARS) {
  const issue = checkNumber(ageYears, "ageYears", "Age", { min: 0 });
  if (issue) return failure([issue], { formulaId });
  if (ageYears < minAge) {
    return blocked(`Adult equation — not applicable below ${minAge} years.`, formulaId);
  }
  return null;
}

/**
 * @param {{ weightKg: number|null, heightCm: number|null }} input
 */
export function calculateBMI({ weightKg, heightCm }) {
  const formulaId = "bmi";
  const issues = collectIssues(
    checkNumber(weightKg, "weightKg", "Weight", POSITIVE),
    checkNumber(heightCm, "heightCm", "Height", POSITIVE)
  );
  if (issues.length) return failure(issues, { formulaId });

  const heightM = cmToM(heightCm);
  const bmi = weightKg / (heightM * heightM);
  return success({
    value: bmi,
    unit: "kg/m²",
    formulaId,
    heightM,
    inputs: { weightKg, heightCm },
    steps: [
      { label: "Height in metres", expression: `${fmt(heightCm)} cm ÷ 100 = ${fmt(heightM, 3)} m` },
      {
        label: "BMI",
        expression: `${fmt(weightKg)} ÷ (${fmt(heightM, 3)} × ${fmt(heightM, 3)}) = ${fmt(bmi)} kg/m²`,
      },
    ],
    warnings: [...heightWarnings(heightCm), ...weightWarnings(weightKg)],
  });
}

/**
 * Classifies an unrounded adult BMI against the Indian / Asia-Pacific cut-offs.
 * Returns category data only — colours and visuals are the UI's concern.
 *
 * @param {number|null} bmi       unrounded BMI
 * @param {number|null} ageYears  required: cut-offs apply to adults only
 */
export function classifyIndianBMI(bmi, ageYears) {
  const formulaId = "indian-bmi-classification";
  const issue = checkNumber(bmi, "bmi", "BMI", POSITIVE);
  if (issue) return failure([issue], { formulaId });
  const adultGate = requireAdult(ageYears, formulaId);
  if (adultGate) {
    if (adultGate.blocked) {
      adultGate.blocked = "Adult BMI cut-offs are not applied under 18 years — use BMI-for-age growth references.";
    }
    return adultGate;
  }
  const category = INDIAN_BMI_CATEGORIES.find((c) => bmi < c.maxExclusive);
  return { ok: true, formulaId, bmi, category };
}

/**
 * @param {{ sex: "male"|"female"|null, waistCm: number|null, ageYears: number|null }} input
 */
export function assessWaistCircumference({ sex, waistCm, ageYears }) {
  const formulaId = "indian-waist";
  const issues = collectIssues(
    checkOption(sex, "sex", "Sex used for equation", SEXES),
    checkNumber(waistCm, "waistCm", "Waist circumference", POSITIVE)
  );
  if (issues.length) return failure(issues, { formulaId });
  const adultGate = requireAdult(ageYears, formulaId);
  if (adultGate) return adultGate;

  const thresholdCm = INDIAN_WAIST_CUTOFF_CM[sex];
  const atOrAbove = waistCm >= thresholdCm;
  const warnings =
    waistCm < PLAUSIBLE.waistCm.min || waistCm > PLAUSIBLE.waistCm.max
      ? [`Waist ${fmt(waistCm)} cm is outside the usual range — please check.`]
      : [];
  return success({
    value: waistCm,
    unit: "cm",
    formulaId,
    thresholdCm,
    atOrAbove,
    inputs: { sex, waistCm },
    steps: [
      {
        label: "Comparison",
        expression: `${fmt(waistCm, 1)} cm ${atOrAbove ? "≥" : "<"} ${thresholdCm} cm (${sex} cut-off)`,
      },
    ],
    warnings,
  });
}
