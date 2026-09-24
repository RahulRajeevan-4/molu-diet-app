/**
 * Formula registry — the single source of truth for every equation's
 * coefficients, version label, source, verification notes and approval status.
 *
 * Calculators read coefficients from here, the UI renders the references from
 * here, and saved/exported assessments record `FORMULA_REGISTRY_VERSION` plus
 * each formula's `id`/`version` so a past result can be reproduced even if a
 * default changes later.
 *
 * `status`:
 *   "approved"               – enabled for clinical-support use.
 *   "requires-confirmation"  – documented but NOT computed until the dietitian
 *                              confirms the intended protocol (see
 *                              docs in CLINICAL_FORMULAS.md). To enable, set the
 *                              confirmed coefficients and status here.
 *
 * Bump FORMULA_REGISTRY_VERSION whenever any coefficient, boundary or status changes.
 */
export const FORMULA_REGISTRY_VERSION = "2026-09-24.1";

export const FORMULAS = Object.freeze({
  bmi: {
    id: "bmi",
    name: "Body Mass Index",
    version: "Quetelet index",
    status: "approved",
    equation: "BMI = weight (kg) ÷ [height (m)]²",
    supplied: "BMI = Weight (kg) / [Height (m)]²",
    verified: "Unchanged. Height is entered in cm and converted to m (÷ 100) before squaring.",
    source: "WHO. Obesity: preventing and managing the global epidemic. WHO Technical Report Series 894, 2000.",
    assumptions: ["Height entered in centimetres."],
    limitations: [
      "Does not distinguish fat from lean mass, oedema or ascites.",
      "Adult cut-offs do not apply to children or adolescents (use growth-reference BMI-for-age).",
    ],
  },

  "indian-bmi-classification": {
    id: "indian-bmi-classification",
    name: "Indian / Asia-Pacific adult BMI classification",
    version: "WHO Asia-Pacific 2000 cut-offs",
    status: "approved",
    equation: "<18.5 Underweight · 18.5–<23 Normal · 23–<25 Overweight · 25–<30 Obesity I · ≥30 Obesity II",
    supplied: "Below 18.5 / 18.5–22.9 / 23.0–24.9 / 25.0–29.9 / ≥30.0",
    verified:
      "Matches the WHO Western Pacific Region Asia-Pacific classification. Comparisons use the unrounded BMI with half-open intervals so values such as 22.95 are classified (Normal).",
    source:
      "WHO Western Pacific Region, IASO & IOTF. The Asia-Pacific Perspective: Redefining Obesity and its Treatment. Sydney: Health Communications Australia; 2000.",
    assumptions: [`Adults only (age ≥ 18 years).`],
    limitations: [
      "Variant: Misra A et al. (JAPI 2009;57:163–170) Indian consensus uses 18.0 as the lower normal limit and does not split obesity into classes. Not used here.",
      "An anthropometric screening classification, not a diagnosis.",
    ],
  },

  "harris-benedict-rounded": {
    id: "harris-benedict-rounded",
    name: "Harris-Benedict",
    version: "Requested rounded coefficients (clinic protocol)",
    status: "approved",
    coefficients: {
      male: { constant: 66.5, weight: 13.7, height: 5, age: 6.7 },
      female: { constant: 655.1, weight: 9.6, height: 1.8, age: 4.6 },
    },
    equation: "Men: 66.5 + 13.7W + 5H − 6.7A · Women: 655.1 + 9.6W + 1.8H − 4.6A (W kg, H cm, A years)",
    supplied: "Men 66.5 + 13.7W + 5H − 6.7A; Women 655.1 + 9.6W + 1.8H − 4.6A",
    verified:
      "Implemented exactly as requested. Note these are truncations of the 1919 coefficients (e.g. age 6.7550 → 6.7 rather than 6.8; 4.6756 → 4.6 rather than 4.7). Differences from the original coefficients are typically under 10 kcal/day. The original coefficients are available as a separately labelled variant; coefficients are never mixed.",
    source:
      "Harris JA, Benedict FG. A Biometric Study of Basal Metabolism in Man. Carnegie Institution of Washington, Publication 279; 1919 (rounded per clinic protocol).",
    assumptions: ["Adults only (age ≥ 18 years).", "Weight basis is selected by the dietitian (actual, IBW, adjusted or manual)."],
    limitations: [
      "Derived from healthy, predominantly normal-weight adults of European descent; may overestimate in some populations.",
      "Estimates basal metabolic rate; not a measured REE.",
    ],
  },

  "harris-benedict-1919": {
    id: "harris-benedict-1919",
    name: "Harris-Benedict",
    version: "Original 1919 coefficients",
    status: "approved",
    coefficients: {
      male: { constant: 66.473, weight: 13.7516, height: 5.0033, age: 6.755 },
      female: { constant: 655.0955, weight: 9.5634, height: 1.8496, age: 4.6756 },
    },
    equation:
      "Men: 66.473 + 13.7516W + 5.0033H − 6.755A · Women: 655.0955 + 9.5634W + 1.8496H − 4.6756A",
    supplied: "Not supplied — reference variant for comparison only.",
    verified: "Coefficients as published in 1919.",
    source: "Harris JA, Benedict FG. A Biometric Study of Basal Metabolism in Man. Carnegie Institution of Washington, Publication 279; 1919.",
    assumptions: ["Adults only (age ≥ 18 years)."],
    limitations: ["Same population limitations as the rounded version."],
  },

  "mifflin-st-jeor": {
    id: "mifflin-st-jeor",
    name: "Mifflin-St Jeor",
    version: "Mifflin et al. 1990 (simplified)",
    status: "approved",
    coefficients: { weight: 10, height: 6.25, age: 5, sexConstant: { male: 5, female: -161 } },
    equation: "10W + 6.25H − 5A + s, where s = +5 (men) or −161 (women)",
    supplied: "Men … + 5; Women … + 161",
    verified: "CORRECTED: the published constant for women is −161, not +161. Implemented with −161.",
    source:
      "Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241–247.",
    assumptions: ["Adults only (age ≥ 18 years; derivation cohort 19–78 y)."],
    limitations: ["Estimates resting energy expenditure; not validated for critically ill patients."],
  },

  "broca-ibw": {
    id: "broca-ibw",
    name: "Ideal body weight — simple Broca",
    version: "Simple Broca index (height cm − 100)",
    status: "approved",
    equation: "IBW (kg) = height (cm) − 100",
    supplied: "IBW = height in meter − 100",
    verified:
      "CORRECTED: height must be in centimetres (height in metres − 100 gives a negative value). Simple form only — not the modified Broca (−10 % men / −15 % women).",
    source: "Broca PP, 1871; as used in Indian dietetic practice.",
    assumptions: ["Adults only (age ≥ 18 years)."],
    limitations: [
      "Tends to overestimate IBW in tall individuals and underestimate in short individuals.",
      "Not sex-specific.",
    ],
  },

  "bmi-ibw": {
    id: "bmi-ibw",
    name: "Ideal body weight — target BMI method",
    version: "BMI rearrangement",
    status: "approved",
    equation: "IBW (kg) = ideal BMI × [height (m)]²",
    supplied: "IBW = Ideal BMI × [Height (m)]²",
    verified: "Unchanged. The ideal BMI must be entered by the dietitian; no default is assumed.",
    source:
      "Rearrangement of the BMI definition; see Peterson CM et al. Universal equation for estimating ideal body weight and body weight at any BMI. Am J Clin Nutr. 2016;103(5):1197–1203.",
    assumptions: ["Target BMI is a clinical decision for the individual patient."],
    limitations: ["Result depends entirely on the chosen target BMI."],
  },

  "adjusted-bw": {
    id: "adjusted-bw",
    name: "Adjusted body weight",
    version: "IBW + 0.25 × (actual − IBW)",
    status: "approved",
    coefficients: { factor: 0.25 },
    equation: "Adjusted BW = IBW + 0.25 × (actual BW − IBW)",
    supplied: "Adjusted BW = IBW + 0.25 × (Actual BW − IBW)",
    verified:
      "Unchanged (0.25 factor). A 0.4 factor also appears in the literature, mainly for drug dosing; not used here.",
    source:
      "Krenitsky J. Adjusted body weight, pro: evidence to support the use of adjusted body weight in calculating calorie requirements. Nutr Clin Pract. 2005;20(4):468–473.",
    assumptions: [
      "Intended for patients with obesity; not applied automatically.",
      "IBW method (Broca, target BMI or clinician-entered) is chosen by the dietitian.",
    ],
    limitations: [
      "Does not by itself establish the appropriate dosing or nutrition weight for every condition.",
      "If actual weight is below IBW, the result is below actual weight and is usually not meaningful.",
    ],
  },

  tee: {
    id: "tee",
    name: "Total Energy Expenditure (TEE/TER)",
    version: "Factorial: BMR/REE × activity × stress",
    status: "approved",
    equation: "TEE = BMR/REE × activity factor × stress factor",
    supplied: "TER = REE/BMR × Activity Factor × Stress Factor",
    verified: "Unchanged. No default activity or stress factors are supplied; both are entered by the dietitian.",
    source:
      "Long CL, Schaffel N, Geiger JW, Schiller WR, Blakemore WS. Metabolic response to injury and illness: estimation of energy and protein needs from indirect calorimetry and nitrogen balance. JPEN. 1979;3(6):452–456.",
    assumptions: ["Activity and stress factors are clinician-selected."],
    limitations: ["Factorial estimates carry compounding error; indirect calorimetry is preferred where available."],
  },

  "curreri-adult": {
    id: "curreri-adult",
    name: "Curreri (adult)",
    version: "Curreri 1974 — 25 kcal/kg UBW + 40 kcal/%TBSA",
    status: "approved",
    coefficients: { perKg: 25, perTbsa: 40, tbsaCapPercent: 50 },
    ageRangeYears: [16, 59],
    equation: "Energy (kcal/day) = 25 × usual body weight (kg) + 40 × %TBSA",
    supplied: "(25 × UBW) + (40 × %TBSA), ages 16–59; one version caps TBSA at 50 %",
    verified:
      "Unchanged. The 50 % TBSA cap is offered as an explicit, labelled protocol option (off by default) and the effective TBSA is always displayed.",
    source:
      "Curreri PW, Richmond D, Marvin J, Baxter CR. Dietary requirements of patients with major burns. J Am Diet Assoc. 1974;65(4):415–417. Review: Gottschlich MM et al. Nutr Clin Pract. 2001;16(3):172–180.",
    assumptions: ["Ages 16–59 completed years.", "Weight basis is usual (pre-burn) body weight unless the dietitian explicitly selects current weight."],
    limitations: ["Frequently overestimates measured requirements by 25–50 %, especially in large burns."],
  },

  "curreri-elderly": {
    id: "curreri-elderly",
    name: "Curreri (age ≥ 60)",
    version: "NOT CONFIRMED",
    status: "requires-confirmation",
    coefficients: { perKg: null, perTbsa: null },
    candidates: [
      { label: "Supplied notes", perKg: 20, perTbsa: 5 },
      { label: "Common published variant", perKg: 20, perTbsa: 65 },
      { label: "Alternative published variant", perKg: 25, perTbsa: 65 },
    ],
    equation: "Energy = ? × weight (kg) + ? × %TBSA — awaiting dietitian confirmation",
    supplied: "(20 × Weight) + (5 × %TBSA)",
    verified:
      "DISCREPANCY: published sources give 65 kcal/%TBSA (not 5), and differ on the weight coefficient (20 vs 25 kcal/kg). Disabled until the dietitian confirms the intended protocol.",
    source: "Curreri PW et al. 1974 and derivative references; sources disagree.",
    assumptions: [],
    limitations: ["Not available for calculation."],
  },

  "curreri-junior": {
    id: "curreri-junior",
    name: "Curreri Junior (paediatric)",
    version: "Day et al. 1986 — RDA + k × %TBSA",
    status: "approved",
    ageGroups: [
      { id: "infant", label: "< 1 year (0–11 months)", minMonths: 0, maxMonthsExclusive: 12, perTbsa: 15 },
      { id: "toddler", label: "1–3 years (12–47 months)", minMonths: 12, maxMonthsExclusive: 48, perTbsa: 25 },
      { id: "child", label: "4–15 years (48–191 months)", minMonths: 48, maxMonthsExclusive: 192, perTbsa: 40 },
    ],
    equation: "Energy (kcal/day) = age-appropriate RDA (kcal/day) + k × %TBSA; k = 15 / 25 / 40",
    supplied: "0–1 y: RDA + 15×TBSA; 1–3 y: RDA + 25×TBSA; 4–15 y: RDA + 40×TBSA",
    verified:
      "Coefficients unchanged. The supplied ranges overlap at 1 year and leave a gap between 3 and 4 years; resolved using completed age in months (see age groups). RDA must be entered as total kcal/day — no RDA values are built in.",
    source:
      "Day T, Dean P, Adams M, et al. Nutritional requirements of the burned child: the Curreri junior formula. Proc Am Burn Assoc. 1986;18:86 (abstract).",
    assumptions: [
      "Age groups use completed age: e.g. 3 years 11 months falls in the 1–3 years group.",
      "RDA is a total daily value in kcal/day, entered by the dietitian from the reference in use (e.g. ICMR-NIN).",
    ],
    limitations: ["Tends to overestimate requirements; review against clinical course."],
  },

  "energy-fluid": {
    id: "energy-fluid",
    name: "Energy-based fluid estimate",
    version: "1 mL per kcal",
    status: "approved",
    coefficients: { mlPerKcal: 1 },
    equation: "Fluid (mL/day) = 1 mL × estimated energy (kcal/day)",
    supplied: "Fluid = 1 mL × kcal",
    verified: "Unchanged. Labelled as an energy-based maintenance estimate, not a burn resuscitation formula.",
    source: "Common adult maintenance rule of thumb (1 mL/kcal); e.g. ASPEN Adult Nutrition Support Core Curriculum.",
    assumptions: ["The energy value is taken from the selected assessment result or entered manually."],
    limitations: [
      "Not appropriate for fluid-restricted patients (e.g. cardiac, renal, hepatic failure) without clinical adjustment.",
      "Not a burn resuscitation volume.",
    ],
  },

  parkland: {
    id: "parkland",
    name: "Burn resuscitation — Parkland-type estimate",
    version: "4 mL × kg × %TBSA over the first 24 h after injury",
    status: "approved",
    coefficients: { mlPerKgPerTbsa: 4 },
    equation: "Fluid (mL, first 24 h after burn) = 4 × body weight (kg) × %TBSA",
    supplied: "4 × Body Weight × %TBSA",
    verified:
      "Unchanged. The 24 h period starts at the time of burn injury, not hospital admission. Conventional split: 50 % in the first 8 h after injury, 50 % over the next 16 h.",
    source:
      "Baxter CR, Shires T. Physiological response to crystalloid resuscitation of severe burns. Ann N Y Acad Sci. 1968;150(3):874–894.",
    assumptions: [`Adults (age ≥ 16 years) only.`, "Actual (current) body weight."],
    limitations: [
      "Current guidance often starts at 2–4 mL/kg/%TBSA and titrates to urine output and haemodynamics.",
      "Children need maintenance fluid in addition; this estimate is not extrapolated to children.",
      "Not routine daily maintenance fluid. Not an infusion order.",
    ],
  },

  "indian-waist": {
    id: "indian-waist",
    name: "Indian adult waist circumference cut-off",
    version: "Asia-Pacific / IDF South Asian cut-offs",
    status: "approved",
    equation: "At risk if waist ≥ 90 cm (men) or ≥ 80 cm (women)",
    supplied: "Male ≥ 90 cm; Female ≥ 80 cm",
    verified: "Unchanged.",
    source:
      "WHO WPRO/IASO/IOTF. The Asia-Pacific Perspective, 2000; IDF Worldwide Definition of the Metabolic Syndrome, 2006 (South Asian cut-offs); Misra A et al. JAPI 2009.",
    assumptions: ["Adults only (age ≥ 18 years)."],
    limitations: ["Anthropometric risk indicator; not a standalone diagnosis."],
  },
});

export function getFormula(id) {
  const f = FORMULAS[id];
  if (!f) throw new Error(`Unknown formula: ${id}`);
  return f;
}

export function isApproved(id) {
  return FORMULAS[id]?.status === "approved";
}
