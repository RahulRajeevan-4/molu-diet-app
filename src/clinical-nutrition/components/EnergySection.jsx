import { useState } from "react";
import { PatientFields, SelectField, NumberField } from "./Fields.jsx";
import { ResultCard, Pending, formatValue } from "./ResultCard.jsx";
import { BMR_SOURCES, WEIGHT_BASES } from "../assessment.js";
import { FORMULAS } from "../constants/formulas.js";
import { HARRIS_BENEDICT_VARIANTS } from "../calculators/energy.js";
import { fmtFixed } from "../utils/result.js";

const HB_VARIANT_LABELS = Object.fromEntries(HARRIS_BENEDICT_VARIANTS.map((id) => [id, FORMULAS[id].version]));

export function WeightBasisNote({ energyWeight }) {
  if (!energyWeight.ok) return <Pending result={energyWeight} />;
  return (
    <p className="cn-note">
      Weight used in BMR equations: <b>{energyWeight.label}</b> = {fmtFixed(energyWeight.value, 1)} kg
    </p>
  );
}

export default function EnergySection({ a }) {
  const { state, results: r, setPatient, setSelection } = a;
  const s = state.selections;
  const [compare, setCompare] = useState(false);

  const hbCard = <ResultCard title="Basal metabolic rate" result={r.harrisBenedict} formulaId={s.hbVariant} />;
  const msjCard = <ResultCard title="Resting energy expenditure" result={r.mifflin} formulaId="mifflin-st-jeor" />;

  return (
    <>
      <div className="card">
        <h2 className="cn-section-title">Step 1 · Patient & weight basis</h2>
        <PatientFields
          fields={["ageYears", "sex", "weightKg", "heightCm"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
        <div className="cn-field-grid cn-mt">
          <SelectField
            id="cn-energyWeightBasis"
            label="Weight basis for BMR equations"
            hint="Chosen by the dietitian. Adjusted BW must first be requested in Ideal & Adjusted Body Weight."
            value={s.energyWeightBasis}
            onChange={(v) => setSelection("energyWeightBasis", v)}
            options={WEIGHT_BASES}
          />
          {s.energyWeightBasis === "manual" && (
            <NumberField
              id="cn-manualWeightKg"
              label="Manual weight"
              unit="kg"
              step="0.1"
              value={s.manualWeightKg}
              error={r.fieldErrors.manualWeightKg}
              onChange={(v) => setSelection("manualWeightKg", v)}
            />
          )}
        </div>
        <WeightBasisNote energyWeight={r.energyWeight} />
      </div>

      <div className="card">
        <h2 className="cn-section-title">Step 2 · BMR / REE equation</h2>
        <div className="cn-field-grid">
          <SelectField
            id="cn-bmrSource"
            label="Equation used for TEE"
            value={s.bmrSource}
            onChange={(v) => setSelection("bmrSource", v)}
            options={BMR_SOURCES}
            placeholder="Select…"
          />
          {s.bmrSource === "harris-benedict" || compare ? (
            <SelectField
              id="cn-hbVariant"
              label="Harris-Benedict version"
              hint="Coefficient sets are never mixed."
              value={s.hbVariant}
              onChange={(v) => setSelection("hbVariant", v)}
              options={HB_VARIANT_LABELS}
            />
          ) : null}
          {s.bmrSource === "manual" && (
            <NumberField
              id="cn-manualReeKcal"
              label="Measured / manual REE"
              unit="kcal/day"
              hint="E.g. indirect calorimetry"
              value={s.manualReeKcal}
              error={r.fieldErrors.manualReeKcal}
              onChange={(v) => setSelection("manualReeKcal", v)}
            />
          )}
        </div>
        <label className="cn-check no-print">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Show Harris-Benedict and Mifflin-St Jeor side by side
        </label>
      </div>

      {compare ? (
        <>
          <div className="cn-results-grid">
            {hbCard}
            {msjCard}
          </div>
          {r.harrisBenedict.ok && r.mifflin.ok && (
            <p className="cn-note">
              Difference: {formatValue(Math.abs(r.harrisBenedict.value - r.mifflin.value), "kcal/day")} kcal/day. Neither
              equation is universally more appropriate; choose based on the patient and your protocol.
            </p>
          )}
        </>
      ) : (
        <div className="cn-results-grid">
          {s.bmrSource === "harris-benedict" && hbCard}
          {s.bmrSource === "mifflin-st-jeor" && msjCard}
        </div>
      )}

      <div className="card">
        <h2 className="cn-section-title">Step 3 · Total Energy Expenditure (TEE/TER)</h2>
        <PatientFields
          fields={["activityFactor", "stressFactor"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
        <p className="cn-note">
          No default activity or stress factors are applied. Enter the factors from your protocol; enter 1 for no
          adjustment.
        </p>
      </div>
      <ResultCard title="Total Energy Expenditure (TEE/TER)" result={r.tee} formulaId="tee" />
    </>
  );
}
