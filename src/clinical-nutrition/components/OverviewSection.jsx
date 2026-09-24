import { PatientFields } from "./Fields.jsx";
import { formatValue } from "./ResultCard.jsx";
import { BmiClassPill } from "./AnthropometrySection.jsx";

function Tile({ label, result, onOpen, children }) {
  return (
    <button type="button" className="stat cn-tile" onClick={onOpen}>
      <div className="n">
        {result?.ok ? (
          <>
            {formatValue(result.value, result.unit)} <small>{result.unit}</small>
          </>
        ) : (
          <span className="dash">—</span>
        )}
      </div>
      <div className="l">{label}</div>
      {children}
    </button>
  );
}

export default function OverviewSection({ a, goTo }) {
  const { state, results: r, setPatient } = a;
  return (
    <>
      <div className="card">
        <h2 className="cn-section-title">Shared patient details</h2>
        <p className="cn-note cn-note-top">
          Enter these once. Every calculator reuses them, and each result updates as you type.
        </p>
        <PatientFields
          fields={["name", "assessmentDate", "ageYears", "sex", "weightKg", "heightCm", "waistCm"]}
          patient={state.patient}
          setPatient={setPatient}
          fieldErrors={r.fieldErrors}
        />
      </div>

      <div className="stats cn-tiles">
        <Tile label="BMI" result={r.bmi} onOpen={() => goTo("anthropometry")}>
          <BmiClassPill bmiClass={r.bmiClass} />
        </Tile>
        <Tile label="Waist" result={r.waist} onOpen={() => goTo("anthropometry")}>
          {r.waist.ok && (
            <span className={`pill ${r.waist.atOrAbove ? "high" : "low"}`}>
              {r.waist.atOrAbove ? `≥ ${r.waist.thresholdCm} cm` : `< ${r.waist.thresholdCm} cm`}
            </span>
          )}
        </Tile>
        <Tile label="Harris-Benedict BMR" result={r.harrisBenedict} onOpen={() => goTo("energy")} />
        <Tile label="Mifflin-St Jeor REE" result={r.mifflin} onOpen={() => goTo("energy")} />
        <Tile label="IBW — simple Broca" result={r.broca} onOpen={() => goTo("weight")} />
        <Tile label="IBW — target BMI" result={r.bmiIbw} onOpen={() => goTo("weight")} />
        {state.selections.adjustedRequested && (
          <Tile label="Adjusted BW" result={r.adjusted} onOpen={() => goTo("weight")} />
        )}
        <Tile label="TEE/TER" result={r.tee} onOpen={() => goTo("energy")} />
      </div>
      <p className="cn-note">
        A dash means the inputs are incomplete or the equation doesn't apply. Open a tile to see what is needed. The
        energy tiles use the weight basis selected in Energy Requirements ({r.energyWeight.ok ? r.energyWeight.label.toLowerCase() : "not available"}).
      </p>
    </>
  );
}
