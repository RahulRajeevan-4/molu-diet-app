import { PatientFields, SelectField, NumberField } from "./Fields.jsx";
import { ResultCard } from "./ResultCard.jsx";
import { BmiClassPill } from "./AnthropometrySection.jsx";
import { IBW_SOURCES } from "../assessment.js";
import { fmtFixed } from "../utils/result.js";

function ObesityIndicator({ r }) {
  if (r.obesityIndicator === null) {
    return <p className="cn-note">Obesity indicator: enter adult age, weight and height to classify BMI.</p>;
  }
  return (
    <p className="cn-note">
      Obesity indicator (Indian adult BMI ≥ 25): <BmiClassPill bmiClass={r.bmiClass} />{" "}
      {r.obesityIndicator
        ? "— adjusted body weight may be considered."
        : "— adjusted body weight is not usually indicated."}
    </p>
  );
}

export default function BodyWeightSection({ a }) {
  const { state, results: r, setPatient, setSelection } = a;
  const s = state.selections;
  const adj = r.adjusted;

  return (
    <>
      <div className="card">
        <h2 className="cn-section-title">Measurements</h2>
        <PatientFields
          fields={["ageYears", "heightCm", "weightKg", "idealBmi"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
      </div>

      <div className="cn-results-grid">
        <ResultCard title="Ideal body weight — method A" result={r.broca} formulaId="broca-ibw">
          <p className="cn-note">Simple Broca: height in centimetres − 100. Not the modified Broca equation.</p>
        </ResultCard>
        <ResultCard title="Ideal body weight — method B" result={r.bmiIbw} formulaId="bmi-ibw">
          <p className="cn-note">Target BMI × height (m)². The target BMI is your clinical choice; none is assumed.</p>
        </ResultCard>
      </div>

      <div className="card">
        <h2 className="cn-section-title">Adjusted body weight</h2>
        <ObesityIndicator r={r} />
        <label className="cn-check">
          <input
            type="checkbox"
            checked={s.adjustedRequested}
            onChange={(e) => setSelection("adjustedRequested", e.target.checked)}
          />
          Calculate adjusted body weight for this patient
        </label>
        {s.adjustedRequested && (
          <div className="cn-field-grid cn-mt">
            <SelectField
              id="cn-ibwSourceForAdjusted"
              label="IBW used"
              value={s.ibwSourceForAdjusted}
              onChange={(v) => setSelection("ibwSourceForAdjusted", v)}
              options={IBW_SOURCES}
            />
            {s.ibwSourceForAdjusted === "manual" && (
              <NumberField
                id="cn-manualIbwKg"
                label="Clinician-determined IBW"
                unit="kg"
                step="0.1"
                value={s.manualIbwKg}
                error={r.fieldErrors.manualIbwKg}
                onChange={(v) => setSelection("manualIbwKg", v)}
              />
            )}
          </div>
        )}
      </div>

      {s.adjustedRequested && (
        <ResultCard title="Adjusted body weight" result={adj} formulaId="adjusted-bw">
          {adj?.ok && (
            <dl className="cn-kv">
              <dt>Actual BW</dt>
              <dd>{fmtFixed(adj.inputs.actualWeightKg, 1)} kg</dd>
              <dt>Ideal BW ({adj.ibwLabel})</dt>
              <dd>{fmtFixed(adj.inputs.idealWeightKg, 1)} kg</dd>
              <dt>Adjusted BW</dt>
              <dd>
                <b>{fmtFixed(adj.value, 1)} kg</b>
              </dd>
            </dl>
          )}
          <p className="cn-note">
            Adjusted body weight is not used automatically. Select it as the weight basis in Energy Requirements if
            appropriate. The formula alone does not establish the right dosing or nutrition weight for every condition.
          </p>
        </ResultCard>
      )}
    </>
  );
}
