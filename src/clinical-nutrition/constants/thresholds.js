/**
 * Clinical cut-offs and age boundaries. All comparisons against these values are
 * made with unrounded results.
 */

/** Adult-only equations (BMI/waist cut-offs, HB, Mifflin, Broca) require age ≥ this. */
export const ADULT_MIN_AGE_YEARS = 18;

/**
 * Burn module age boundary. The adult Curreri equation is specified for 16–59 y
 * and Curreri Junior covers up to 15 y, so 16 is the adult boundary for all burn
 * calculations (Curreri and Parkland-type fluid).
 */
export const BURN_ADULT_MIN_AGE_YEARS = 16;
export const BURN_ELDERLY_MIN_AGE_YEARS = 60;

/**
 * Indian (Asia-Pacific) adult BMI classification, in ascending order.
 * A BMI belongs to the first band whose `maxExclusive` it is below.
 */
export const INDIAN_BMI_CATEGORIES = Object.freeze([
  { id: "underweight", label: "Underweight", range: "< 18.5", maxExclusive: 18.5, severity: "warn" },
  { id: "normal", label: "Normal weight", range: "18.5 – 22.9", maxExclusive: 23, severity: "good" },
  { id: "overweight", label: "Overweight", range: "23.0 – 24.9", maxExclusive: 25, severity: "warn" },
  { id: "obesity-1", label: "Obesity Class I", range: "25.0 – 29.9", maxExclusive: 30, severity: "bad" },
  { id: "obesity-2", label: "Obesity Class II", range: "≥ 30.0", maxExclusive: Infinity, severity: "bad" },
]);

/** BMI categories that trigger the adjusted-body-weight eligibility indicator. */
export const OBESITY_CATEGORY_IDS = Object.freeze(["obesity-1", "obesity-2"]);

/** Indian adult waist circumference cut-offs (at or above = flagged). */
export const INDIAN_WAIST_CUTOFF_CM = Object.freeze({ male: 90, female: 80 });

/** Parkland-type estimate: fraction of 24 h volume given in the first 8 h after injury. */
export const PARKLAND_FIRST_PHASE_HOURS = 8;
export const PARKLAND_FIRST_PHASE_FRACTION = 0.5;

/**
 * Soft plausibility ranges. Values outside these produce a warning (they may be
 * unit-entry errors, e.g. height in metres) but are never clamped or blocked.
 */
export const PLAUSIBLE = Object.freeze({
  heightCm: { min: 40, max: 250 },
  weightKg: { min: 1, max: 350 },
  waistCm: { min: 30, max: 250 },
  ageYears: { max: 120 },
  activityFactor: { min: 1, max: 2.5 },
  stressFactor: { min: 1, max: 2.5 },
  idealBmi: { min: 18.5, max: 25 },
});

export const SEXES = Object.freeze(["male", "female"]);
