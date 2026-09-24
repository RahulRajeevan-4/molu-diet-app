import { PatientFields, SelectField, NumberField } from "./Fields.jsx";
import { ResultCard } from "./ResultCard.jsx";
import { FORMULAS } from "../constants/formulas.js";
import { fmt, fmtFixed } from "../utils/result.js";

const CURRERI_WEIGHT_BASES = {
  usual: "Usual (pre-burn) body weight — per Curreri",
  current: "Current body weight (usual weight unavailable)",
};

function ElderlyDiscrepancy() {
  const f = FORMULAS["curreri-elderly"];
  return (
    <div className="cn-alert">
      <b>Age ≥ 60: equation not enabled.</b> {f.verified}
      <table className="cn-ref-table cn-mt">
        <thead>
          <tr>
            <th>Version</th>
            <th>kcal/kg</th>
            <th>kcal/%TBSA</th>
          </tr>
        </thead>
        <tbody>
          {f.candidates.map((c) => (
            <tr key={c.label}>
              <td>{c.label}</td>
              <td>{c.perKg}</td>
              <td>{c.perTbsa}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BurnSection({ a }) {
  const { state, results: r, setPatient, setSelection } = a;
  const s = state.selections;
  const group = r.curreriGroup;
  const isJunior = group?.formulaId === "curreri-junior";
  const isAdult = group?.formulaId === "curreri-adult";
  const c = r.curreri;

  const fields = ["ageYears"];
  if (!group || isJunior) fields.push("ageMonths");
  if (isAdult) fields.push("usualWeightKg", "weightKg");
  fields.push("tbsaPercent");

  return (
    <>
      <div className="cn-alert">
        Burn energy requirements vary substantially between patients and over the course of recovery. These are
        estimates for review by the treating clinical team, and are separate from the ordinary BMR calculators.
      </div>

      <div className="card">
        <h2 className="cn-section-title">Patient</h2>
        <PatientFields fields={fields} patient={state.patient} setPatient={setPatient} fieldErrors={r.fieldErrors} />
        {group && (
          <p className="cn-note">
            Equation for this age: <b>{FORMULAS[group.formulaId].name}</b>
            {group.group ? ` — age group ${group.group.label}` : ""}
          </p>
        )}

        {isAdult && (
          <div className="cn-field-grid cn-mt">
            <SelectField
              id="cn-curreriWeightBasis"
              label="Weight basis"
              value={s.curreriWeightBasis}
              onChange={(v) => setSelection("curreriWeightBasis", v)}
              options={CURRERI_WEIGHT_BASES}
            />
            <label className="cn-check cn-check-inline">
              <input
                type="checkbox"
                checked={s.applyTbsaCap}
                onChange={(e) => setSelection("applyTbsaCap", e.target.checked)}
              />
              Protocol option: cap %TBSA at 50 %
            </label>
          </div>
        )}

        {isJunior && (
          <div className="cn-field-grid cn-mt">
            <NumberField
              id="cn-rdaKcalPerDay"
              label="Age-appropriate RDA"
              unit="kcal/day"
              hint="TOTAL daily energy RDA for this child from your reference (e.g. ICMR-NIN) — not kcal/kg/day. No values are built in."
              value={s.rdaKcalPerDay}
              error={r.fieldErrors.rdaKcalPerDay}
              onChange={(v) => setSelection("rdaKcalPerDay", v)}
            />
          </div>
        )}
      </div>

      {group?.formulaId === "curreri-elderly" && FORMULAS["curreri-elderly"].status !== "approved" && (
        <ElderlyDiscrepancy />
      )}

      <ResultCard title="Burn energy requirement" result={c}>
        {c.ok && (
          <dl className="cn-kv">
            <dt>Patient age</dt>
            <dd>
              {c.ageLabel}
              {c.ageGroup ? ` (${c.ageGroup.label})` : ""}
            </dd>
            <dt>Weight basis</dt>
            <dd>
              {c.weightBasis
                ? `${CURRERI_WEIGHT_BASES[c.weightBasis]} — ${fmtFixed(c.weightKg, 1)} kg`
                : `Not used — RDA ${fmt(c.inputs.rdaKcalPerDay)} kcal/day`}
            </dd>
            <dt>Actual %TBSA</dt>
            <dd>{fmt(c.tbsaPercent, 1)} %</dd>
            <dt>Effective %TBSA</dt>
            <dd>
              {fmt(c.effectiveTbsaPercent, 1)} %{c.capApplied ? " (50 % protocol cap applied)" : ""}
            </dd>
            <dt>Equation</dt>
            <dd>{FORMULAS[c.formulaId].equation}</dd>
            <dt>Source</dt>
            <dd>{FORMULAS[c.formulaId].source}</dd>
          </dl>
        )}
      </ResultCard>
    </>
  );
}
