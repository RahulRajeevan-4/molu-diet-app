import { FORMULAS, FORMULA_REGISTRY_VERSION } from "../constants/formulas.js";

export default function FormulaLogSection() {
  return (
    <div className="card">
      <h2 className="cn-section-title">Formula verification log</h2>
      <p className="cn-note cn-note-top">
        Each formula as originally supplied, as verified and implemented, with source and status. Registry version{" "}
        {FORMULA_REGISTRY_VERSION}.
      </p>
      <div className="cn-log">
        {Object.values(FORMULAS).map((f) => (
          <details key={f.id} className="cn-log-item">
            <summary>
              <span className={`pill ${f.status === "approved" ? "low" : "high"}`}>
                <span className="pill-dot" />
                {f.status === "approved" ? "Enabled" : "Needs confirmation"}
              </span>
              <b>{f.name}</b> <span className="cn-muted">— {f.version}</span>
            </summary>
            <dl>
              <dt>Supplied</dt>
              <dd>{f.supplied}</dd>
              <dt>Verified / implemented</dt>
              <dd>{f.verified}</dd>
              <dt>Equation</dt>
              <dd>{f.equation}</dd>
              <dt>Source</dt>
              <dd>{f.source}</dd>
              {f.assumptions.length > 0 && (
                <>
                  <dt>Assumptions</dt>
                  <dd>{f.assumptions.join(" ")}</dd>
                </>
              )}
              <dt>Limitations</dt>
              <dd>{f.limitations.join(" ")}</dd>
            </dl>
          </details>
        ))}
      </div>
    </div>
  );
}
