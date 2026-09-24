import { PatientFields } from "./Fields.jsx";
import { ResultCard } from "./ResultCard.jsx";
import { INDIAN_BMI_CATEGORIES } from "../constants/thresholds.js";
import { fmtFixed } from "../utils/result.js";

/** Maps classification severity to the app's existing pill colours. */
export const SEVERITY_PILL = { good: "low", warn: "medium", bad: "high" };

const SCALE_MIN = 15;
const SCALE_MAX = 35;

export function BmiClassPill({ bmiClass }) {
  if (!bmiClass?.ok) return null;
  const c = bmiClass.category;
  return (
    <span className={`pill ${SEVERITY_PILL[c.severity]}`}>
      <span className="pill-dot" />
      {c.label}
    </span>
  );
}

function BmiScale({ bmi }) {
  const pos = (v) => ((Math.min(Math.max(v, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
  let prev = SCALE_MIN;
  return (
    <div className="cn-scale" aria-hidden="true">
      <div className="cn-scale-track">
        {INDIAN_BMI_CATEGORIES.map((c) => {
          const start = pos(prev);
          const end = pos(c.maxExclusive);
          prev = c.maxExclusive;
          return (
            <span
              key={c.id}
              className={`cn-scale-seg ${SEVERITY_PILL[c.severity]}`}
              style={{ left: `${start}%`, width: `${end - start}%` }}
              title={`${c.label}: ${c.range}`}
            />
          );
        })}
        <span className="cn-scale-marker" style={{ left: `${pos(bmi)}%` }} />
      </div>
      <div className="cn-scale-ticks">
        {[18.5, 23, 25, 30].map((t) => (
          <span key={t} style={{ left: `${pos(t)}%` }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BmiClassificationTable({ activeId }) {
  return (
    <table className="cn-ref-table">
      <thead>
        <tr>
          <th>BMI (kg/m²)</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        {INDIAN_BMI_CATEGORIES.map((c) => (
          <tr key={c.id} className={c.id === activeId ? "active" : ""}>
            <td>{c.range}</td>
            <td>{c.label}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AnthropometrySection({ a }) {
  const { state, results: r, setPatient } = a;
  return (
    <>
      <div className="card">
        <h2 className="cn-section-title">Measurements</h2>
        <PatientFields
          fields={["ageYears", "sex", "weightKg", "heightCm", "waistCm"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
      </div>
      <div className="cn-results-grid">
        <ResultCard
          title="Body Mass Index"
          result={r.bmi}
          badge={<BmiClassPill bmiClass={r.bmiClass} />}
          copyText={
            r.bmi.ok
              ? `BMI: ${fmtFixed(r.bmi.value, 2)} kg/m²${r.bmiClass.ok ? ` — ${r.bmiClass.category.label} (Indian adult cut-offs, WHO Asia-Pacific 2000)` : ""}`
              : ""
          }
        >
          {r.bmi.ok && (
            <>
              {r.bmiClass.ok ? (
                <>
                  <BmiScale bmi={r.bmi.value} />
                  <BmiClassificationTable activeId={r.bmiClass.category.id} />
                  <p className="cn-note">
                    Reference: Indian / Asia-Pacific adult classification. Classified on the unrounded BMI.
                  </p>
                </>
              ) : (
                <p className="cn-blocked">
                  {r.bmiClass.blocked ?? "Enter age to apply the adult classification."}
                </p>
              )}
            </>
          )}
        </ResultCard>

        <ResultCard
          title="Waist circumference"
          result={r.waist}
          valueLabel="Measured"
          badge={
            r.waist.ok && (
              <span className={`pill ${r.waist.atOrAbove ? "high" : "low"}`}>
                <span className="pill-dot" />
                {r.waist.atOrAbove ? "At or above cut-off" : "Below cut-off"}
              </span>
            )
          }
          copyText={
            r.waist.ok
              ? `Waist circumference: ${fmtFixed(r.waist.value, 1)} cm; threshold ${r.waist.thresholdCm} cm (${state.patient.sex}) — ${r.waist.atOrAbove ? "at or above" : "below"} the specified cut-off`
              : ""
          }
        >
          {r.waist.ok && (
            <>
              <dl className="cn-kv">
                <dt>Recorded</dt>
                <dd>{fmtFixed(r.waist.value, 1)} cm</dd>
                <dt>Threshold ({state.patient.sex})</dt>
                <dd>≥ {r.waist.thresholdCm} cm</dd>
                <dt>Result</dt>
                <dd>{r.waist.atOrAbove ? "At or above the specified cut-off" : "Below the specified cut-off"}</dd>
              </dl>
            </>
          )}
          <p className="cn-note">
            An anthropometric risk indicator for abdominal adiposity — not a standalone diagnosis.
          </p>
        </ResultCard>
      </div>
    </>
  );
}
