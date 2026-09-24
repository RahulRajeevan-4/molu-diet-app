import { success, failure, fmt } from "../utils/result.js";
import { checkNumber, collectIssues, POSITIVE } from "../utils/validation.js";
import { getFormula } from "../constants/formulas.js";
import { PLAUSIBLE } from "../constants/thresholds.js";
import { cmToM, heightWarnings, requireAdult } from "./anthropometry.js";

/**
 * Simple Broca IBW: height in CENTIMETRES − 100.
 */
export function calculateBrocaIBW({ heightCm, ageYears }) {
  const formulaId = "broca-ibw";
  const issue = checkNumber(heightCm, "heightCm", "Height", POSITIVE);
  if (issue) return failure([issue], { formulaId });
  const adultGate = requireAdult(ageYears, formulaId);
  if (adultGate) return adultGate;

  const ibw = heightCm - 100;
  if (ibw <= 0) {
    return failure(
      [{ field: "heightCm", kind: "invalid", message: "Broca IBW is not defined for heights of 100 cm or less" }],
      { formulaId }
    );
  }
  return success({
    value: ibw,
    unit: "kg",
    formulaId,
    inputs: { heightCm },
    steps: [{ label: "IBW", expression: `${fmt(heightCm)} cm − 100 = ${fmt(ibw)} kg` }],
    warnings: heightWarnings(heightCm),
  });
}

/**
 * IBW = ideal BMI × height(m)². The ideal BMI is always clinician-supplied.
 */
export function calculateBMIBasedIBW({ idealBmi, heightCm }) {
  const formulaId = "bmi-ibw";
  const issues = collectIssues(
    checkNumber(idealBmi, "idealBmi", "Ideal BMI", POSITIVE),
    checkNumber(heightCm, "heightCm", "Height", POSITIVE)
  );
  if (issues.length) return failure(issues, { formulaId });

  const heightM = cmToM(heightCm);
  const ibw = idealBmi * heightM * heightM;
  const warnings = [...heightWarnings(heightCm)];
  if (idealBmi < PLAUSIBLE.idealBmi.min || idealBmi > PLAUSIBLE.idealBmi.max) {
    warnings.push(`Ideal BMI ${fmt(idealBmi)} is outside the ${PLAUSIBLE.idealBmi.min}–${PLAUSIBLE.idealBmi.max} range — please confirm this is intended.`);
  }
  return success({
    value: ibw,
    unit: "kg",
    formulaId,
    inputs: { idealBmi, heightCm },
    steps: [
      { label: "Height in metres", expression: `${fmt(heightCm)} cm ÷ 100 = ${fmt(heightM, 3)} m` },
      {
        label: "IBW",
        expression: `${fmt(idealBmi)} × (${fmt(heightM, 3)} × ${fmt(heightM, 3)}) = ${fmt(ibw)} kg`,
      },
    ],
    warnings,
  });
}

/**
 * Adjusted BW = IBW + 0.25 × (actual − IBW).
 */
export function calculateAdjustedBodyWeight({ actualWeightKg, idealWeightKg }) {
  const formulaId = "adjusted-bw";
  const issues = collectIssues(
    checkNumber(actualWeightKg, "weightKg", "Actual body weight", POSITIVE),
    checkNumber(idealWeightKg, "idealWeightKg", "Ideal body weight", POSITIVE)
  );
  if (issues.length) return failure(issues, { formulaId });

  const { factor } = getFormula(formulaId).coefficients;
  const excess = actualWeightKg - idealWeightKg;
  const adjusted = idealWeightKg + factor * excess;
  const warnings = [];
  if (excess < 0) {
    warnings.push("Actual weight is below ideal body weight — adjusted body weight is not normally used in this situation.");
  }
  return success({
    value: adjusted,
    unit: "kg",
    formulaId,
    inputs: { actualWeightKg, idealWeightKg, factor },
    steps: [
      { label: "Actual BW", expression: `${fmt(actualWeightKg)} kg` },
      { label: "Ideal BW", expression: `${fmt(idealWeightKg)} kg` },
      {
        label: "Adjusted BW",
        expression: `${fmt(idealWeightKg)} + ${factor} × (${fmt(actualWeightKg)} − ${fmt(idealWeightKg)}) = ${fmt(adjusted)} kg`,
      },
    ],
    warnings,
  });
}
