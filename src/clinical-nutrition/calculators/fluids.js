import { success, failure, blocked, fmt } from "../utils/result.js";
import { checkNumber, collectIssues, POSITIVE } from "../utils/validation.js";
import { getFormula } from "../constants/formulas.js";
import {
  BURN_ADULT_MIN_AGE_YEARS,
  PARKLAND_FIRST_PHASE_FRACTION,
  PARKLAND_FIRST_PHASE_HOURS,
} from "../constants/thresholds.js";
import { weightWarnings } from "./anthropometry.js";
import { checkTbsa } from "./burns.js";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Energy-based maintenance fluid estimate: 1 mL per kcal.
 */
export function calculateEnergyBasedFluid({ energyKcalPerDay }) {
  const formulaId = "energy-fluid";
  const issue = checkNumber(energyKcalPerDay, "energyKcalPerDay", "Estimated energy", POSITIVE);
  if (issue) return failure([issue], { formulaId });

  const { mlPerKcal } = getFormula(formulaId).coefficients;
  const fluidMl = mlPerKcal * energyKcalPerDay;
  return success({
    value: fluidMl,
    unit: "mL/day",
    formulaId,
    litres: fluidMl / 1000,
    inputs: { energyKcalPerDay },
    steps: [
      {
        label: "Fluid",
        expression: `${mlPerKcal} mL × ${fmt(energyKcalPerDay)} kcal/day = ${fmt(fluidMl)} mL/day (${fmt(fluidMl / 1000)} L/day)`,
      },
    ],
  });
}

/**
 * Parkland-type 4 mL/kg/%TBSA estimate for the first 24 h AFTER THE BURN.
 * Adults only. Returns volumes — never rates or orders.
 *
 * @param {{
 *   weightKg: number|null, tbsaPercent: number|null, ageYears: number|null,
 *   injuryTime?: Date|null,     // time of burn injury (not admission)
 *   referenceTime?: Date|null,  // "now", for elapsed-since-injury display
 * }} input
 */
export function calculateBurnResuscitationFluid({ weightKg, tbsaPercent, ageYears, injuryTime = null, referenceTime = null }) {
  const formulaId = "parkland";
  const issues = collectIssues(
    checkNumber(weightKg, "weightKg", "Body weight", POSITIVE),
    checkTbsa(tbsaPercent),
    checkNumber(ageYears, "ageYears", "Age", { min: 0 })
  );
  if (issues.length) return failure(issues, { formulaId });
  if (ageYears < BURN_ADULT_MIN_AGE_YEARS) {
    return blocked(
      `Not extrapolated to children (under ${BURN_ADULT_MIN_AGE_YEARS} years). Paediatric burn resuscitation needs a paediatric protocol including maintenance fluid.`,
      formulaId
    );
  }

  const { mlPerKgPerTbsa } = getFormula(formulaId).coefficients;
  const totalMl = mlPerKgPerTbsa * weightKg * tbsaPercent;
  const firstPhaseMl = totalMl * PARKLAND_FIRST_PHASE_FRACTION;
  const secondPhaseMl = totalMl - firstPhaseMl;
  const secondPhaseHours = 24 - PARKLAND_FIRST_PHASE_HOURS;

  const warnings = [...weightWarnings(weightKg)];
  let timing = null;
  if (injuryTime instanceof Date && !Number.isNaN(injuryTime.getTime())) {
    const firstPhaseEnds = new Date(injuryTime.getTime() + PARKLAND_FIRST_PHASE_HOURS * HOUR_MS);
    const windowEnds = new Date(injuryTime.getTime() + 24 * HOUR_MS);
    let hoursSinceInjury = null;
    if (referenceTime instanceof Date && !Number.isNaN(referenceTime.getTime())) {
      hoursSinceInjury = (referenceTime.getTime() - injuryTime.getTime()) / HOUR_MS;
      if (hoursSinceInjury < 0) warnings.push("Time of injury is in the future — please check.");
      else if (hoursSinceInjury >= 24) warnings.push("More than 24 h have elapsed since injury; this first-24-hour estimate no longer applies.");
      else if (hoursSinceInjury >= PARKLAND_FIRST_PHASE_HOURS) {
        warnings.push("The first 8 h after injury have already elapsed. Review fluid actually given with the treating team.");
      }
    }
    timing = { injuryTime, firstPhaseEnds, windowEnds, hoursSinceInjury };
  }

  return success({
    value: totalMl,
    unit: "mL",
    formulaId,
    litres: totalMl / 1000,
    firstPhaseMl,
    secondPhaseMl,
    firstPhaseHours: PARKLAND_FIRST_PHASE_HOURS,
    secondPhaseHours,
    timing,
    inputs: { weightKg, tbsaPercent, ageYears },
    steps: [
      {
        label: "24 h total",
        expression: `${mlPerKgPerTbsa} × ${fmt(weightKg)} kg × ${fmt(tbsaPercent)} % = ${fmt(totalMl)} mL (${fmt(totalMl / 1000)} L)`,
      },
      {
        label: `First ${PARKLAND_FIRST_PHASE_HOURS} h after injury`,
        expression: `50 % = ${fmt(firstPhaseMl)} mL`,
      },
      { label: `Next ${secondPhaseHours} h`, expression: `50 % = ${fmt(secondPhaseMl)} mL` },
    ],
    warnings,
  });
}
