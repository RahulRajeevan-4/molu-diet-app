import { success, failure, fmt } from "../utils/result.js";
import { checkNumber, checkOption, collectIssues, POSITIVE } from "../utils/validation.js";
import { getFormula } from "../constants/formulas.js";
import { PLAUSIBLE, SEXES } from "../constants/thresholds.js";
import { requireAdult, heightWarnings, weightWarnings } from "./anthropometry.js";

export const HARRIS_BENEDICT_VARIANTS = Object.freeze(["harris-benedict-rounded", "harris-benedict-1919"]);

function adultBmrIssues({ sex, weightKg, heightCm, ageYears }) {
  return collectIssues(
    checkOption(sex, "sex", "Sex used for equation", SEXES),
    checkNumber(weightKg, "weightKg", "Weight", POSITIVE),
    checkNumber(heightCm, "heightCm", "Height", POSITIVE),
    checkNumber(ageYears, "ageYears", "Age", { min: 0 })
  );
}

/**
 * Harris-Benedict BMR. `variant` selects a complete coefficient set; sets are
 * never mixed.
 *
 * @param {{ sex, weightKg, heightCm, ageYears, variant?: "harris-benedict-rounded"|"harris-benedict-1919" }} input
 */
export function calculateHarrisBenedict({ sex, weightKg, heightCm, ageYears, variant = "harris-benedict-rounded" }) {
  if (!HARRIS_BENEDICT_VARIANTS.includes(variant)) {
    throw new Error(`Unknown Harris-Benedict variant: ${variant}`);
  }
  const formulaId = variant;
  const issues = adultBmrIssues({ sex, weightKg, heightCm, ageYears });
  if (issues.length) return failure(issues, { formulaId });
  const adultGate = requireAdult(ageYears, formulaId);
  if (adultGate) return adultGate;

  const c = getFormula(variant).coefficients[sex];
  const wTerm = c.weight * weightKg;
  const hTerm = c.height * heightCm;
  const aTerm = c.age * ageYears;
  const bmr = c.constant + wTerm + hTerm - aTerm;

  return success({
    value: bmr,
    unit: "kcal/day",
    formulaId,
    inputs: { sex, weightKg, heightCm, ageYears },
    steps: [
      {
        label: "Substituted",
        expression: `${c.constant} + (${c.weight} × ${fmt(weightKg)}) + (${c.height} × ${fmt(heightCm)}) − (${c.age} × ${fmt(ageYears)})`,
      },
      {
        label: "Terms",
        expression: `${c.constant} + ${fmt(wTerm)} + ${fmt(hTerm)} − ${fmt(aTerm)} = ${fmt(bmr)} kcal/day`,
      },
    ],
    warnings: [...heightWarnings(heightCm), ...weightWarnings(weightKg)],
  });
}

/**
 * Mifflin-St Jeor REE. Women: −161 (the supplied notes' +161 was an error).
 */
export function calculateMifflinStJeor({ sex, weightKg, heightCm, ageYears }) {
  const formulaId = "mifflin-st-jeor";
  const issues = adultBmrIssues({ sex, weightKg, heightCm, ageYears });
  if (issues.length) return failure(issues, { formulaId });
  const adultGate = requireAdult(ageYears, formulaId);
  if (adultGate) return adultGate;

  const c = getFormula(formulaId).coefficients;
  const s = c.sexConstant[sex];
  const wTerm = c.weight * weightKg;
  const hTerm = c.height * heightCm;
  const aTerm = c.age * ageYears;
  const ree = wTerm + hTerm - aTerm + s;
  const sText = s < 0 ? `− ${Math.abs(s)}` : `+ ${s}`;

  return success({
    value: ree,
    unit: "kcal/day",
    formulaId,
    inputs: { sex, weightKg, heightCm, ageYears },
    steps: [
      {
        label: "Substituted",
        expression: `(${c.weight} × ${fmt(weightKg)}) + (${c.height} × ${fmt(heightCm)}) − (${c.age} × ${fmt(ageYears)}) ${sText}`,
      },
      {
        label: "Terms",
        expression: `${fmt(wTerm)} + ${fmt(hTerm)} − ${fmt(aTerm)} ${sText} = ${fmt(ree)} kcal/day`,
      },
    ],
    warnings: [...heightWarnings(heightCm), ...weightWarnings(weightKg)],
  });
}

/**
 * TEE = BMR/REE × activity factor × stress factor. Factors are always supplied
 * by the dietitian; there are no defaults.
 */
export function calculateTEE({ bmrKcalPerDay, activityFactor, stressFactor }) {
  const formulaId = "tee";
  const issues = collectIssues(
    checkNumber(bmrKcalPerDay, "bmrKcalPerDay", "BMR/REE", POSITIVE),
    checkNumber(activityFactor, "activityFactor", "Activity factor", POSITIVE),
    checkNumber(stressFactor, "stressFactor", "Stress factor", POSITIVE)
  );
  if (issues.length) return failure(issues, { formulaId });

  const tee = bmrKcalPerDay * activityFactor * stressFactor;
  const warnings = [];
  const { activityFactor: af, stressFactor: sf } = PLAUSIBLE;
  if (activityFactor < af.min || activityFactor > af.max) {
    warnings.push(`Activity factor ${fmt(activityFactor)} is outside the usual ${af.min}–${af.max} range — please check.`);
  }
  if (stressFactor < sf.min || stressFactor > sf.max) {
    warnings.push(`Stress factor ${fmt(stressFactor)} is outside the usual ${sf.min}–${sf.max} range — please check.`);
  }
  return success({
    value: tee,
    unit: "kcal/day",
    formulaId,
    inputs: { bmrKcalPerDay, activityFactor, stressFactor },
    steps: [
      { label: "BMR/REE", expression: `${fmt(bmrKcalPerDay)} kcal/day` },
      { label: "Activity factor", expression: fmt(activityFactor) },
      { label: "Stress factor", expression: fmt(stressFactor) },
      {
        label: "TEE",
        expression: `${fmt(bmrKcalPerDay)} × ${fmt(activityFactor)} × ${fmt(stressFactor)} = ${fmt(tee)} kcal/day`,
      },
    ],
    warnings,
  });
}
