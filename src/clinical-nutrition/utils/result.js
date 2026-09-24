/**
 * Every calculator returns one of these two shapes, so the UI can always tell a
 * real result from an incomplete or blocked calculation and never shows a
 * misleading number.
 *
 * @typedef {{ label: string, expression: string }} Step
 *
 * @typedef {{
 *   ok: true,
 *   value: number,          // full precision; round only for display
 *   unit: string,
 *   formulaId: string,
 *   steps: Step[],          // substituted equation / breakdown lines
 *   inputs: Record<string, unknown>,
 *   warnings: string[],
 *   [extra: string]: unknown,
 * }} CalcSuccess
 *
 * @typedef {{
 *   ok: false,
 *   formulaId?: string,
 *   issues: import("./validation.js").Issue[],
 *   blocked?: string,       // set when the formula is not approved / not applicable
 * }} CalcFailure
 */

/** @returns {CalcSuccess} */
export function success({ value, unit, formulaId, steps = [], inputs = {}, warnings = [], ...extra }) {
  return { ok: true, value, unit, formulaId, steps, inputs, warnings, ...extra };
}

/** @returns {CalcFailure} */
export function failure(issues, { formulaId, blocked } = {}) {
  return { ok: false, formulaId, issues, ...(blocked ? { blocked } : {}) };
}

/** Blocked by policy (age restriction, unapproved formula) rather than by bad input. */
export function blocked(reason, formulaId) {
  return { ok: false, formulaId, issues: [], blocked: reason };
}

/**
 * Formats a number for substituted equations and display. Uses up to `dp`
 * decimals and trims trailing zeros, so user inputs appear as entered.
 */
export function fmt(n, dp = 2) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return Number(n.toFixed(dp)).toLocaleString("en-IN", { maximumFractionDigits: dp });
}

/** Fixed-decimal display, e.g. BMI 24.22. */
export function fmtFixed(n, dp) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
