import { CopyButton, formatValue } from "./ResultCard.jsx";
import { BmiClassPill } from "./AnthropometrySection.jsx";
import { EnergySourceSelect } from "./FluidSection.jsx";
import { buildAssessmentRecord, buildSummaryText, ENERGY_SOURCES, BMR_SOURCES } from "../assessment.js";
import { FORMULAS, FORMULA_REGISTRY_VERSION } from "../constants/formulas.js";
import { fmt, fmtFixed } from "../utils/result.js";

function reason(result) {
  if (!result) return "Not requested";
  if (result.blocked) return result.blocked;
  const invalid = result.issues?.find((i) => i.kind === "invalid");
  if (invalid) return invalid.message;
  const missing = result.issues?.filter((i) => i.kind === "missing") ?? [];
  return missing.length ? `Needs ${missing.map((i) => i.message.replace(/ is required$/, "")).join(", ")}` : "Not calculated";
}

function Row({ label, result, children }) {
  const f = result?.ok ? FORMULAS[result.formulaId] : null;
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {result?.ok ? (
          <>
            <b>
              {formatValue(result.value, result.unit)} {result.unit}
            </b>{" "}
            {children}
          </>
        ) : (
          <span className="cn-muted">{reason(result)}</span>
        )}
      </td>
      <td className="cn-muted">{f ? `${f.name} — ${f.version}` : result?.ok ? "Manual entry" : ""}</td>
    </tr>
  );
}

function downloadRecord(state, r) {
  const record = buildAssessmentRecord(state, r);
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nutrition-assessment-${state.patient.assessmentDate || "undated"}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SummarySection({ a }) {
  const { state, results: r, setNotes } = a;
  const p = state.patient;
  const s = state.selections;
  const burnEntered = p.tbsaPercent !== "";

  const usedFormulaIds = [
    r.bmi, r.bmiClass, r.waist, r.harrisBenedict, r.mifflin, r.broca, r.bmiIbw, r.adjusted, r.tee,
    burnEntered && r.curreri, r.energyFluid, burnEntered && r.parkland,
  ]
    .filter((x) => x?.ok && FORMULAS[x.formulaId])
    .map((x) => x.formulaId);
  const limitations = [...new Set(usedFormulaIds.flatMap((id) => FORMULAS[id].limitations))];

  return (
    <>
      <div className="cn-toolbar no-print">
        <button type="button" className="chip-btn active" onClick={() => window.print()}>
          Print summary
        </button>
        <CopyButton text={buildSummaryText(state, r)} label="Copy summary" />
        <button type="button" className="chip-btn" onClick={() => downloadRecord(state, r)}>
          Download record (JSON)
        </button>
      </div>

      <article className="card cn-summary">
        <header className="cn-summary-head">
          <div>
            <p className="eyebrow">Clinical nutrition assessment</p>
            <h2>{p.name || "Unnamed patient"}</h2>
          </div>
          <p className="cn-muted">Assessment date: {p.assessmentDate || "—"}</p>
        </header>

        <p className="cn-disclaimer">
          All values are <b>estimates</b> to support clinical judgement. They are not prescriptions or orders.
        </p>

        <h3 className="cn-sub">Patient & anthropometry</h3>
        <dl className="cn-kv cn-kv-wide">
          <dt>Age</dt>
          <dd>{p.ageYears !== "" ? `${p.ageYears} y${r.values.ageMonths ? ` ${r.values.ageMonths} m` : ""}` : "—"}</dd>
          <dt>Sex (equation)</dt>
          <dd>{p.sex || "—"}</dd>
          <dt>Weight</dt>
          <dd>{p.weightKg !== "" ? `${p.weightKg} kg` : "—"}</dd>
          <dt>Height</dt>
          <dd>{p.heightCm !== "" ? `${p.heightCm} cm` : "—"}</dd>
          <dt>Waist</dt>
          <dd>{p.waistCm !== "" ? `${p.waistCm} cm` : "—"}</dd>
          {p.usualWeightKg !== "" && (
            <>
              <dt>Usual weight</dt>
              <dd>{p.usualWeightKg} kg</dd>
            </>
          )}
        </dl>

        <table className="cn-summary-table">
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Result</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody>
            <Row label="BMI" result={r.bmi}>
              {r.bmiClass.ok ? <BmiClassPill bmiClass={r.bmiClass} /> : r.bmi.ok && <span className="cn-muted">(unclassified: {reason(r.bmiClass)})</span>}
            </Row>
            <Row label="Waist circumference" result={r.waist}>
              {r.waist.ok && `— ${r.waist.atOrAbove ? "at or above" : "below"} ${r.waist.thresholdCm} cm cut-off`}
            </Row>
            <Row label="Harris-Benedict BMR" result={r.harrisBenedict} />
            <Row label="Mifflin-St Jeor REE" result={r.mifflin} />
            <Row label="TEE/TER" result={r.tee}>
              {r.tee.ok && (
                <span className="cn-muted">
                  ({BMR_SOURCES[s.bmrSource]} × {fmt(r.tee.inputs.activityFactor)} × {fmt(r.tee.inputs.stressFactor)})
                </span>
              )}
            </Row>
            <Row label="IBW — simple Broca" result={r.broca} />
            <Row label="IBW — target BMI" result={r.bmiIbw}>
              {r.bmiIbw.ok && <span className="cn-muted">(target BMI {fmt(r.bmiIbw.inputs.idealBmi)})</span>}
            </Row>
            {s.adjustedRequested && (
              <Row label="Adjusted body weight" result={r.adjusted}>
                {r.adjusted?.ok && <span className="cn-muted">(IBW: {r.adjusted.ibwLabel})</span>}
              </Row>
            )}
            {burnEntered && (
              <>
                <Row label="Burn energy (Curreri)" result={r.curreri}>
                  {r.curreri.ok && (
                    <span className="cn-muted">
                      ({fmt(r.curreri.effectiveTbsaPercent, 1)} % TBSA{r.curreri.capApplied ? ", capped" : ""})
                    </span>
                  )}
                </Row>
                <Row label="Burn resuscitation fluid (first 24 h after injury)" result={r.parkland}>
                  {r.parkland.ok && <span className="cn-muted">({fmtFixed(r.parkland.litres, 2)} L)</span>}
                </Row>
              </>
            )}
            <Row label="Energy-based fluid" result={r.energyFluid} />
          </tbody>
        </table>

        <h3 className="cn-sub">Selected estimated energy requirement</h3>
        <div className="no-print">
          <EnergySourceSelect a={a} />
        </div>
        <p>
          {r.selectedEnergy.ok ? (
            <>
              <b>{formatValue(r.selectedEnergy.value, "kcal/day")} kcal/day</b> —{" "}
              {ENERGY_SOURCES[s.energySourceForFluid]}
            </>
          ) : (
            <span className="cn-muted">{reason(r.selectedEnergy)}</span>
          )}
        </p>

        <h3 className="cn-sub">Selected methods</h3>
        <ul className="cn-list">
          <li>Weight basis for BMR equations: {r.energyWeight.ok ? `${r.energyWeight.label} (${fmtFixed(r.energyWeight.value, 1)} kg)` : "—"}</li>
          <li>BMR/REE for TEE: {BMR_SOURCES[s.bmrSource] ?? "not selected"}{s.bmrSource === "harris-benedict" ? ` (${FORMULAS[s.hbVariant].version})` : ""}</li>
          <li>BMI & waist cut-offs: Indian / Asia-Pacific adult</li>
          <li>Formula registry version: {FORMULA_REGISTRY_VERSION}</li>
        </ul>

        {limitations.length > 0 && (
          <>
            <h3 className="cn-sub">Assumptions & limitations</h3>
            <ul className="cn-list">
              {limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        )}

        <h3 className="cn-sub">Dietitian notes</h3>
        <textarea
          className="recipe-textarea no-print"
          rows={4}
          value={state.notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional clinical notes…"
        />
        <p className="print-only cn-notes-print">{state.notes || "—"}</p>
      </article>
    </>
  );
}
