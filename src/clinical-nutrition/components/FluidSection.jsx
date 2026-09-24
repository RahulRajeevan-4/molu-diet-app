import { PatientFields, SelectField, NumberField, InfoTip } from "./Fields.jsx";
import { ResultCard } from "./ResultCard.jsx";
import { ENERGY_SOURCES } from "../assessment.js";
import { fmt, fmtFixed } from "../utils/result.js";

function formatDateTime(d) {
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function EnergySourceSelect({ a }) {
  const { state, results: r, setSelection } = a;
  const s = state.selections;
  return (
    <div className="cn-field-grid">
      <SelectField
        id="cn-energySourceForFluid"
        label="Selected estimated energy requirement"
        hint="Carried to the assessment summary and the energy-based fluid estimate"
        value={s.energySourceForFluid}
        onChange={(v) => setSelection("energySourceForFluid", v)}
        options={ENERGY_SOURCES}
        placeholder="Select…"
      />
      {s.energySourceForFluid === "manual" && (
        <NumberField
          id="cn-manualEnergyKcal"
          label="Manual energy"
          unit="kcal/day"
          value={s.manualEnergyKcal}
          error={r.fieldErrors.manualEnergyKcal}
          onChange={(v) => setSelection("manualEnergyKcal", v)}
        />
      )}
    </div>
  );
}

export default function FluidSection({ a }) {
  const { state, results: r, setPatient, setSelection } = a;
  const p = r.parkland;

  return (
    <>
      <div className="card">
        <h2 className="cn-section-title">A · Energy-based fluid estimate</h2>
        <EnergySourceSelect a={a} />
      </div>
      <ResultCard title="Energy-based fluid estimate" result={r.energyFluid} formulaId="energy-fluid">
        {r.energyFluid.ok && <p className="cn-note">= {fmt(r.energyFluid.litres)} L/day. A maintenance estimate, not a burn resuscitation volume.</p>}
      </ResultCard>

      <div className="cn-alert">
        <b>Burn resuscitation — assessment support only.</b> Fluid administration needs clinician-directed monitoring
        (e.g. urine output, haemodynamics) and adjustment. No infusion orders or rates are generated.
      </div>
      <div className="card">
        <h2 className="cn-section-title">B · Burn resuscitation fluid (Parkland-type)</h2>
        <PatientFields
          fields={["ageYears", "weightKg", "tbsaPercent"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
        <div className="cn-field-grid cn-mt">
          <label className="cn-field" htmlFor="cn-injuryTime">
            <span className="cn-label">
              Time of burn injury (optional){" "}
              <InfoTip text="The 24 h period starts at the time of injury — not hospital admission or this assessment." />
            </span>
            <input
              id="cn-injuryTime"
              type="datetime-local"
              value={state.selections.injuryTime}
              onChange={(e) => setSelection("injuryTime", e.target.value)}
            />
          </label>
        </div>
      </div>
      <ResultCard title="Burn resuscitation fluid — first 24 h after injury" result={p} formulaId="parkland">
        {p.ok && (
          <>
            <p className="cn-note">= {fmtFixed(p.litres, 2)} L over the first 24 hours after the burn.</p>
            <dl className="cn-kv">
              <dt>First {p.firstPhaseHours} h after injury (50 %)</dt>
              <dd>{fmtFixed(p.firstPhaseMl, 0)} mL</dd>
              <dt>Next {p.secondPhaseHours} h (50 %)</dt>
              <dd>{fmtFixed(p.secondPhaseMl, 0)} mL</dd>
              {p.timing && (
                <>
                  <dt>Injury time</dt>
                  <dd>{formatDateTime(p.timing.injuryTime)}</dd>
                  <dt>First 8 h window ends</dt>
                  <dd>{formatDateTime(p.timing.firstPhaseEnds)}</dd>
                  <dt>24 h window ends</dt>
                  <dd>{formatDateTime(p.timing.windowEnds)}</dd>
                  {p.timing.hoursSinceInjury !== null && (
                    <>
                      <dt>Elapsed since injury</dt>
                      <dd>{fmt(p.timing.hoursSinceInjury, 1)} h</dd>
                    </>
                  )}
                </>
              )}
            </dl>
            <p className="cn-note">
              Not routine maintenance fluid. Fluids given before this assessment (pre-hospital / referring unit) are not
              accounted for.
            </p>
          </>
        )}
      </ResultCard>
    </>
  );
}
