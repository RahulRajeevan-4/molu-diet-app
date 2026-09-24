import { PATIENT_FIELDS } from "../constants/fields.js";

export function InfoTip({ text }) {
  if (!text) return null;
  return (
    <span className="cn-info" title={text} aria-label={text} role="img">
      ⓘ
    </span>
  );
}

export function NumberField({ id, label, unit, value, onChange, error, hint, step = "any", disabled = false }) {
  const errId = error ? `${id}-err` : undefined;
  return (
    <label className={"cn-field" + (error ? " has-error" : "")} htmlFor={id}>
      <span className="cn-label">
        {label} <InfoTip text={hint} />
      </span>
      <span className="cn-input-wrap">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={errId}
        />
        {unit && <span className="cn-unit">{unit}</span>}
      </span>
      {error && (
        <span className="cn-error" id={errId}>
          {error}
        </span>
      )}
    </label>
  );
}

export function SelectField({ id, label, value, onChange, options, hint, placeholder }) {
  return (
    <label className="cn-field" htmlFor={id}>
      <span className="cn-label">
        {label} <InfoTip text={hint} />
      </span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Renders a subset of the shared patient fields. Every section writes to the
 * same state, so a value entered once is reused by every calculator.
 */
export function PatientFields({ fields, patient, setPatient, fieldErrors }) {
  return (
    <div className="cn-field-grid">
      {fields.map((f) => {
        const def = PATIENT_FIELDS[f];
        const id = `cn-${f}`;
        if (def.type === "sex") {
          return (
            <SelectField
              key={f}
              id={id}
              label={def.label}
              hint={def.hint}
              value={patient.sex}
              onChange={(v) => setPatient("sex", v)}
              placeholder="Select…"
              options={{ male: "Male", female: "Female" }}
            />
          );
        }
        if (def.type === "text" || def.type === "date") {
          return (
            <label key={f} className="cn-field" htmlFor={id}>
              <span className="cn-label">
                {def.label} <InfoTip text={def.hint} />
              </span>
              <input
                id={id}
                type={def.type}
                value={patient[f]}
                autoComplete="off"
                onChange={(e) => setPatient(f, e.target.value)}
              />
            </label>
          );
        }
        return (
          <NumberField
            key={f}
            id={id}
            label={def.label}
            unit={def.unit}
            step={def.step}
            hint={def.hint}
            value={patient[f]}
            error={fieldErrors[f]}
            onChange={(v) => setPatient(f, v)}
          />
        );
      })}
    </div>
  );
}
