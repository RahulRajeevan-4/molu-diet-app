import { describe, it, expect } from "vitest";
import { createInitialState, computeAssessment, buildAssessmentRecord, buildSummaryText } from "../assessment.js";
import { FORMULA_REGISTRY_VERSION } from "../constants/formulas.js";

function stateWith(patient = {}, selections = {}) {
  const s = createInitialState("2026-09-24");
  return { ...s, patient: { ...s.patient, ...patient }, selections: { ...s.selections, ...selections } };
}

// The spec's worked example: 35 F, 70 kg, 160 cm, waist 85 cm.
const example = { ageYears: "35", sex: "female", weightKg: "70", heightCm: "160", waistCm: "85" };

describe("unified assessment", () => {
  it("shows no numeric results for an empty form", () => {
    const r = computeAssessment(createInitialState());
    for (const key of ["bmi", "waist", "harrisBenedict", "mifflin", "broca", "bmiIbw", "tee", "curreri", "energyFluid", "parkland"]) {
      expect(r[key].ok, key).toBe(false);
    }
    expect(r.adjusted).toBeNull();
  });

  it("calculates every applicable assessment from shared inputs", () => {
    const r = computeAssessment(stateWith(example));
    expect(r.bmi.value).toBeCloseTo(27.34, 2);
    expect(r.bmiClass.category.id).toBe("obesity-1");
    expect(r.waist.atOrAbove).toBe(true);
    expect(r.harrisBenedict.value).toBeCloseTo(1454.1, 6);
    expect(r.mifflin.value).toBeCloseTo(1364, 6);
    expect(r.broca.value).toBe(60);
    expect(r.obesityIndicator).toBe(true);
    // Not supplied / not requested → not shown
    expect(r.bmiIbw.ok).toBe(false);
    expect(r.adjusted).toBeNull();
    expect(r.tee.ok).toBe(false);
  });

  it("changing one shared input updates every dependent result", () => {
    const a = computeAssessment(stateWith(example));
    const b = computeAssessment(stateWith({ ...example, weightKg: "80" }));
    for (const key of ["bmi", "harrisBenedict", "mifflin"]) {
      expect(b[key].value, key).not.toBe(a[key].value);
    }
    const c = computeAssessment(stateWith({ ...example, heightCm: "170" }));
    for (const key of ["bmi", "harrisBenedict", "mifflin", "broca"]) {
      expect(c[key].value, key).not.toBe(a[key].value);
    }
  });

  it("TEE follows the selected BMR equation and factors", () => {
    const base = { ...example, activityFactor: "1.2", stressFactor: "1.1" };
    const hb = computeAssessment(stateWith(base, { bmrSource: "harris-benedict" }));
    const msj = computeAssessment(stateWith(base, { bmrSource: "mifflin-st-jeor" }));
    const manual = computeAssessment(stateWith(base, { bmrSource: "manual", manualReeKcal: "1500" }));
    expect(hb.tee.value).toBeCloseTo(1454.1 * 1.2 * 1.1, 6);
    expect(msj.tee.value).toBeCloseTo(1364 * 1.2 * 1.1, 6);
    expect(manual.tee.value).toBeCloseTo(1500 * 1.2 * 1.1, 6);
  });

  it("TEE is not calculated until an equation is selected", () => {
    const r = computeAssessment(stateWith({ ...example, activityFactor: "1.2", stressFactor: "1" }));
    expect(r.tee.ok).toBe(false);
  });

  it("uses the selected weight basis for BMR equations", () => {
    const r = computeAssessment(stateWith(example, { energyWeightBasis: "ibw-broca" }));
    expect(r.energyWeight.value).toBe(60);
    expect(r.mifflin.value).toBeCloseTo(600 + 1000 - 175 - 161, 6);
  });

  it("adjusted body weight only when explicitly requested, with chosen IBW source", () => {
    const off = computeAssessment(stateWith(example));
    expect(off.adjusted).toBeNull();
    const broca = computeAssessment(stateWith(example, { adjustedRequested: true }));
    expect(broca.adjusted.value).toBeCloseTo(60 + 0.25 * 10, 8);
    const bmi = computeAssessment(stateWith({ ...example, idealBmi: "22" }, { adjustedRequested: true, ibwSourceForAdjusted: "bmi" }));
    const ibw = 22 * 1.6 * 1.6;
    expect(bmi.adjusted.value).toBeCloseTo(ibw + 0.25 * (70 - ibw), 8);
    const manual = computeAssessment(stateWith(example, { adjustedRequested: true, ibwSourceForAdjusted: "manual", manualIbwKg: "55" }));
    expect(manual.adjusted.value).toBeCloseTo(58.75, 8);
  });

  it("adjusted weight basis is unavailable unless adjusted BW is requested", () => {
    const r = computeAssessment(stateWith(example, { energyWeightBasis: "adjusted" }));
    expect(r.energyWeight.ok).toBe(false);
    expect(r.mifflin.ok).toBe(false);
  });

  it("does not treat an invalid entry as zero", () => {
    const r = computeAssessment(stateWith({ ...example, weightKg: "abc" }));
    expect(r.bmi.ok).toBe(false);
    expect(r.fieldErrors.weightKg).toMatch(/valid number/);
  });

  it("energy-based fluid follows the selected energy source", () => {
    const r = computeAssessment(
      stateWith({ ...example, activityFactor: "1.2", stressFactor: "1" }, { bmrSource: "mifflin-st-jeor", energySourceForFluid: "tee" })
    );
    expect(r.energyFluid.value).toBeCloseTo(1364 * 1.2, 6);
  });

  it("Curreri uses usual body weight by default", () => {
    const r = computeAssessment(stateWith({ ...example, usualWeightKg: "72", tbsaPercent: "30" }));
    expect(r.curreri.value).toBe(25 * 72 + 40 * 30);
    expect(r.parkland.value).toBe(4 * 70 * 30); // resuscitation uses current weight
  });

  it("ignores leftover paediatric months once the patient is an adult", () => {
    const r = computeAssessment(stateWith({ ...example, ageMonths: "11", usualWeightKg: "72", tbsaPercent: "30" }));
    expect(r.values.ageMonths).toBeNull();
    expect(r.curreri.ageLabel).toBe("35 y");
    const child = computeAssessment(stateWith({ ageYears: "3", ageMonths: "11" }));
    expect(child.values.ageMonths).toBe(11);
  });

  it("builds a reproducible record with formula versions", () => {
    const state = stateWith(example);
    const r = computeAssessment(state);
    const rec = buildAssessmentRecord(state, r, { generatedAt: new Date("2026-09-24T00:00:00Z") });
    expect(rec.formulaRegistryVersion).toBe(FORMULA_REGISTRY_VERSION);
    expect(rec.results["Mifflin-St Jeor REE"]).toMatchObject({ formulaId: "mifflin-st-jeor", unit: "kcal/day" });
    expect(rec.results["Indian BMI classification"].category).toBe("Obesity Class I");
    expect(rec.results["TEE/TER"]).toBeUndefined();
    expect(buildSummaryText(state, r)).toMatch(/ESTIMATES, NOT PRESCRIPTIONS/);
  });
});
