import { useState } from "react";
import { FORMULAS } from "../constants/formulas.js";
import { fmtFixed } from "../utils/result.js";

/** Display precision per unit. Calculations keep full precision. */
const DISPLAY_DP = { "kg/m²": 2, kg: 1, cm: 1, "kcal/day": 0, "mL/day": 0, mL: 0 };

export function formatValue(value, unit) {
  return fmtFixed(value, DISPLAY_DP[unit] ?? 1);
}

export function CopyButton({ text, label = "Copy" }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied");
    } catch {
      setStatus("Copy failed");
    }
    setTimeout(() => setStatus(""), 1600);
  }
  return (
    <button type="button" className="chip-btn cn-small-btn no-print" onClick={copy} disabled={!text}>
      {status || label}
    </button>
  );
}

export function FormulaInfo({ formulaId }) {
  const f = FORMULAS[formulaId];
  if (!f) return null;
  return (
    <details className="cn-formula no-print">
      <summary>Formula &amp; reference</summary>
      <dl>
        <dt>Equation</dt>
        <dd>{f.equation}</dd>
        <dt>Version</dt>
        <dd>{f.version}</dd>
        <dt>Source</dt>
        <dd>{f.source}</dd>
        {f.assumptions.length > 0 && (
          <>
            <dt>Assumptions</dt>
            <dd>
              <ul>
                {f.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt>Limitations</dt>
        <dd>
          <ul>
            {f.limitations.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </dd>
      </dl>
    </details>
  );
}

/** Lists what is missing (muted) or invalid (error) — never a number. */
export function Pending({ result }) {
  if (!result || result.ok) return null;
  if (result.blocked) return <p className="cn-blocked">{result.blocked}</p>;
  const missing = result.issues.filter((i) => i.kind === "missing");
  const invalid = result.issues.filter((i) => i.kind === "invalid");
  return (
    <div className="cn-pending">
      {invalid.map((i) => (
        <p key={i.message} className="cn-error">
          {i.message}
        </p>
      ))}
      {missing.length > 0 && <p>Needs: {missing.map((i) => i.message.replace(/ is required$/, "")).join(", ")}</p>}
    </div>
  );
}

export function Warnings({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <ul className="cn-warnings">
      {warnings.map((w) => (
        <li key={w}>{w}</li>
      ))}
    </ul>
  );
}

export function Breakdown({ steps, open = false }) {
  if (!steps?.length) return null;
  return (
    <details className="cn-breakdown" open={open}>
      <summary>Calculation breakdown</summary>
      <ol>
        {steps.map((s) => (
          <li key={s.label}>
            <span className="cn-step-label">{s.label}</span>
            <code>{s.expression}</code>
          </li>
        ))}
      </ol>
    </details>
  );
}

/**
 * Standard card for one calculation: title, formula version, estimate value,
 * badge slot, breakdown, warnings, reference and copy.
 */
export function ResultCard({ title, result, formulaId, badge, children, copyText, valueLabel = "Estimate" }) {
  const fid = formulaId ?? result?.formulaId;
  const f = FORMULAS[fid];
  const text =
    copyText ??
    (result?.ok
      ? `${title}: ${formatValue(result.value, result.unit)} ${result.unit}${f ? ` (${f.name}, ${f.version})` : ""} — estimate`
      : "");
  return (
    <section className="card cn-result">
      <header className="cn-result-head">
        <div>
          <h3>{title}</h3>
          {f && (
            <p className="cn-version">
              {f.name} · {f.version}
            </p>
          )}
        </div>
        {result?.ok && <CopyButton text={text} />}
      </header>
      {result?.ok ? (
        <>
          <div className="cn-value-row">
            <span className="cn-value">{formatValue(result.value, result.unit)}</span>
            <span className="cn-value-unit">{result.unit}</span>
            <span className="cn-estimate-tag">{valueLabel}</span>
            {badge}
          </div>
          {children}
          <Breakdown steps={result.steps} />
          <Warnings warnings={result.warnings} />
        </>
      ) : (
        <>
          <Pending result={result} />
          {children}
        </>
      )}
      <FormulaInfo formulaId={fid} />
    </section>
  );
}
