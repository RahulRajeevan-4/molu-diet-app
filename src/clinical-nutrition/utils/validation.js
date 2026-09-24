/**
 * Input validation shared by every calculator.
 *
 * Calculators never receive raw form strings. Form values are parsed with
 * `parseNumberInput`, which maps a blank field to `null` (missing) rather than 0,
 * and anything non-numeric to NaN (invalid). Calculators then validate with
 * `checkNumber` and refuse to compute on any issue — nothing is clamped.
 *
 * @typedef {{ field: string, kind: "missing" | "invalid", message: string }} Issue
 */

/**
 * @param {string | number | null | undefined} raw
 * @returns {number | null} null when blank; NaN when not a finite number
 */
export function parseNumberInput(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : NaN;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {unknown} value
 * @param {string} field   key of the input, used to attach inline errors
 * @param {string} label   human-readable name, e.g. "Height"
 * @param {{ min?: number, max?: number, minExclusive?: boolean, maxExclusive?: boolean, integer?: boolean, unit?: string }} [rules]
 * @returns {Issue | null}
 */
export function checkNumber(value, field, label, rules = {}) {
  if (value === null || value === undefined || value === "") {
    return { field, kind: "missing", message: `${label} is required` };
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { field, kind: "invalid", message: `${label} must be a valid number` };
  }
  const { min, max, minExclusive = false, maxExclusive = false, integer = false, unit = "" } = rules;
  const u = unit ? ` ${unit}` : "";
  if (integer && !Number.isInteger(value)) {
    return { field, kind: "invalid", message: `${label} must be a whole number` };
  }
  if (min !== undefined) {
    if (minExclusive ? value <= min : value < min) {
      const msg = minExclusive
        ? min === 0
          ? `${label} must be greater than 0`
          : `${label} must be greater than ${min}${u}`
        : min === 0
          ? `${label} cannot be negative`
          : `${label} must be at least ${min}${u}`;
      return { field, kind: "invalid", message: msg };
    }
  }
  if (max !== undefined) {
    if (maxExclusive ? value >= max : value > max) {
      return {
        field,
        kind: "invalid",
        message: `${label} must be ${maxExclusive ? "less than" : "at most"} ${max}${u}`,
      };
    }
  }
  return null;
}

/**
 * @param {unknown} value
 * @param {string} field
 * @param {string} label
 * @param {readonly string[]} allowed
 * @returns {Issue | null}
 */
export function checkOption(value, field, label, allowed) {
  if (value === null || value === undefined || value === "") {
    return { field, kind: "missing", message: `${label} is required` };
  }
  if (!allowed.includes(value)) {
    return { field, kind: "invalid", message: `${label} must be one of: ${allowed.join(", ")}` };
  }
  return null;
}

/** Common positive-number rule. */
export const POSITIVE = Object.freeze({ min: 0, minExclusive: true });

/** Drops nulls from a list of check results. */
export function collectIssues(...checks) {
  return checks.filter(Boolean);
}
