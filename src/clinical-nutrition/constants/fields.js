/** Presentation metadata for the shared patient fields. */
export const PATIENT_FIELDS = Object.freeze({
  name: { label: "Patient name", type: "text", hint: "Optional — leave blank for quick calculations" },
  assessmentDate: { label: "Assessment date", type: "date" },
  ageYears: { label: "Age", unit: "years", step: "1", hint: "Completed years" },
  ageMonths: { label: "Additional months", unit: "months", step: "1", hint: "0–11; used for paediatric burn age groups" },
  sex: { label: "Sex used for equation", type: "sex", hint: "The sex-specific coefficients applied by the equations" },
  weightKg: { label: "Current weight", unit: "kg", step: "0.1" },
  heightCm: { label: "Height", unit: "cm", step: "0.1", hint: "Centimetres — converted to metres where a formula needs it" },
  waistCm: { label: "Waist circumference", unit: "cm", step: "0.1" },
  usualWeightKg: { label: "Usual body weight", unit: "kg", step: "0.1", hint: "Pre-illness / pre-burn weight" },
  activityFactor: { label: "Activity factor", unit: "×", step: "0.01", hint: "Clinician-selected multiplier" },
  stressFactor: { label: "Stress factor", unit: "×", step: "0.01", hint: "Clinician-selected multiplier; enter 1 if none" },
  idealBmi: { label: "Target (ideal) BMI", unit: "kg/m²", step: "0.1", hint: "Clinician-selected — no default is assumed" },
  tbsaPercent: { label: "Burn size", unit: "% TBSA", step: "0.5", hint: "Total body surface area burned, 0–100" },
});
