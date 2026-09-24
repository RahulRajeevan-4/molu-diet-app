import { success, failure, blocked, fmt } from "../utils/result.js";
import { checkNumber, collectIssues, POSITIVE } from "../utils/validation.js";
import { FORMULAS } from "../constants/formulas.js";
import { BURN_ADULT_MIN_AGE_YEARS, BURN_ELDERLY_MIN_AGE_YEARS } from "../constants/thresholds.js";
import { weightWarnings } from "./anthropometry.js";

/** %TBSA must be > 0 and ≤ 100 for any burn calculation. */
export function checkTbsa(tbsaPercent) {
  return checkNumber(tbsaPercent, "tbsaPercent", "Burn %TBSA", { min: 0, minExclusive: true, max: 100, unit: "%" });
}

/** Age in completed years (whole number) plus optional extra months (0–11). */
export function checkAge(ageYears, ageMonths) {
  return collectIssues(
    checkNumber(ageYears, "ageYears", "Age", { min: 0, integer: true, max: 130 }),
    ageMonths === null || ageMonths === undefined
      ? null
      : checkNumber(ageMonths, "ageMonths", "Additional months", { min: 0, max: 11, integer: true })
  );
}

/**
 * Resolves which Curreri equation applies. Boundaries use completed age, so
 * groups never overlap and there are no gaps.
 *
 * @returns {{ formulaId: string, group: object|null, totalMonths: number }}
 */
export function getCurreriAgeGroup(ageYears, ageMonths = null, formulas = FORMULAS) {
  const totalMonths = ageYears * 12 + (ageMonths ?? 0);
  if (ageYears >= BURN_ELDERLY_MIN_AGE_YEARS) return { formulaId: "curreri-elderly", group: null, totalMonths };
  if (ageYears >= BURN_ADULT_MIN_AGE_YEARS) return { formulaId: "curreri-adult", group: null, totalMonths };
  const group = formulas["curreri-junior"].ageGroups.find(
    (g) => totalMonths >= g.minMonths && totalMonths < g.maxMonthsExclusive
  );
  return { formulaId: "curreri-junior", group, totalMonths };
}

function describeAge(ageYears, ageMonths) {
  return ageMonths ? `${ageYears} y ${ageMonths} m` : `${ageYears} y`;
}

/**
 * Curreri burn energy estimate (adult, ≥ 60, or Curreri Junior by age).
 *
 * @param {{
 *   ageYears: number|null, ageMonths?: number|null,
 *   weightKg: number|null,              // weight on the selected basis
 *   weightBasis?: "usual"|"current",
 *   tbsaPercent: number|null,
 *   rdaKcalPerDay?: number|null,        // paediatric only: TOTAL kcal/day, not kcal/kg
 *   applyTbsaCap?: boolean,             // adult protocol option: cap %TBSA at 50
 *   formulas?: typeof FORMULAS,         // injectable for tests / confirmed protocols
 * }} input
 */
export function calculateCurreriEnergy({
  ageYears,
  ageMonths = null,
  weightKg,
  weightBasis = "usual",
  tbsaPercent,
  rdaKcalPerDay = null,
  applyTbsaCap = false,
  formulas = FORMULAS,
}) {
  const ageIssues = checkAge(ageYears, ageMonths);
  const tbsaIssue = checkTbsa(tbsaPercent);
  if (ageIssues.length) return failure([...ageIssues, ...(tbsaIssue ? [tbsaIssue] : [])], { formulaId: "curreri-adult" });

  const { formulaId, group, totalMonths } = getCurreriAgeGroup(ageYears, ageMonths, formulas);
  const formula = formulas[formulaId];
  const ageLabel = describeAge(ageYears, ageMonths);

  if (formula.status !== "approved") {
    return blocked(
      `${formula.name} is disabled until the dietitian confirms the intended protocol — published coefficients conflict with the supplied notes.`,
      formulaId
    );
  }

  if (formulaId === "curreri-junior") {
    const issues = collectIssues(
      tbsaIssue,
      checkNumber(rdaKcalPerDay, "rdaKcalPerDay", "Age-appropriate RDA (kcal/day)", POSITIVE)
    );
    if (!group) return blocked("No paediatric Curreri age group matches this age.", formulaId);
    if (issues.length) return failure(issues, { formulaId });

    const tbsaTerm = group.perTbsa * tbsaPercent;
    const energy = rdaKcalPerDay + tbsaTerm;
    const warnings = [];
    if (rdaKcalPerDay < 250) {
      warnings.push(
        `RDA of ${fmt(rdaKcalPerDay)} looks like a per-kg value. Enter the TOTAL age-appropriate RDA in kcal/day.`
      );
    }
    if (applyTbsaCap) warnings.push("The 50 % TBSA cap is an adult-formula protocol option and was not applied.");
    return success({
      value: energy,
      unit: "kcal/day",
      formulaId,
      ageLabel,
      totalMonths,
      ageGroup: group,
      weightBasis: null,
      weightKg: null,
      tbsaPercent,
      effectiveTbsaPercent: tbsaPercent,
      capApplied: false,
      inputs: { ageYears, ageMonths, tbsaPercent, rdaKcalPerDay },
      steps: [
        { label: "Age group", expression: `${ageLabel} → ${group.label} (k = ${group.perTbsa})` },
        {
          label: "Energy",
          expression: `${fmt(rdaKcalPerDay)} + (${group.perTbsa} × ${fmt(tbsaPercent)}) = ${fmt(energy)} kcal/day`,
        },
      ],
      warnings,
    });
  }

  // Adult (16–59) or a confirmed ≥ 60 protocol.
  const weightLabel = weightBasis === "usual" ? "Usual body weight" : "Current body weight";
  const issues = collectIssues(checkNumber(weightKg, "weightKg", weightLabel, POSITIVE), tbsaIssue);
  if (issues.length) return failure(issues, { formulaId });

  const { perKg, perTbsa, tbsaCapPercent } = formula.coefficients;
  const capApplied = Boolean(applyTbsaCap && tbsaCapPercent && tbsaPercent > tbsaCapPercent);
  const effectiveTbsaPercent = applyTbsaCap && tbsaCapPercent ? Math.min(tbsaPercent, tbsaCapPercent) : tbsaPercent;
  const weightTerm = perKg * weightKg;
  const tbsaTerm = perTbsa * effectiveTbsaPercent;
  const energy = weightTerm + tbsaTerm;
  const warnings = [...weightWarnings(weightKg, weightLabel)];
  if (weightBasis !== "usual") {
    warnings.push("Curreri specifies usual (pre-burn) body weight; current weight was explicitly selected instead.");
  }
  if (applyTbsaCap && !tbsaCapPercent) warnings.push("This equation has no TBSA cap; the cap option was ignored.");

  const steps = [{ label: "Age", expression: `${ageLabel} → ${formula.name}` }];
  if (applyTbsaCap && tbsaCapPercent) {
    steps.push({
      label: "Effective %TBSA",
      expression: `min(${fmt(tbsaPercent)}, ${tbsaCapPercent}) = ${fmt(effectiveTbsaPercent)} %${capApplied ? " (capped)" : ""}`,
    });
  }
  steps.push(
    {
      label: "Substituted",
      expression: `(${perKg} × ${fmt(weightKg)}) + (${perTbsa} × ${fmt(effectiveTbsaPercent)})`,
    },
    { label: "Energy", expression: `${fmt(weightTerm)} + ${fmt(tbsaTerm)} = ${fmt(energy)} kcal/day` }
  );

  return success({
    value: energy,
    unit: "kcal/day",
    formulaId,
    ageLabel,
    totalMonths,
    ageGroup: null,
    weightBasis,
    weightKg,
    tbsaPercent,
    effectiveTbsaPercent,
    capApplied,
    inputs: { ageYears, ageMonths, weightKg, weightBasis, tbsaPercent, applyTbsaCap },
    steps,
    warnings,
  });
}
