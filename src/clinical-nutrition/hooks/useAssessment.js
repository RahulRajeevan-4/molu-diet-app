import { useCallback, useEffect, useMemo, useState } from "react";
import { createInitialState, computeAssessment } from "../assessment.js";

/**
 * Session-local by design: the app has no patient-record backend, so the
 * assessment lives in sessionStorage (this browser tab only, cleared when the
 * tab closes) rather than localStorage, to avoid leaving identifiable data
 * behind on a shared computer.
 */
const SESSION_KEY = "molu_nutrition_assessment";

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadSession() {
  const fresh = createInitialState(today());
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw);
    // Merge so fields added in later versions get their defaults.
    return {
      patient: { ...fresh.patient, ...saved.patient },
      selections: { ...fresh.selections, ...saved.selections },
      notes: typeof saved.notes === "string" ? saved.notes : "",
    };
  } catch {
    return fresh;
  }
}

export function useAssessment() {
  const [state, setState] = useState(loadSession);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // Storage unavailable (private mode / quota) — keep working in memory.
    }
  }, [state]);

  const setPatient = useCallback((field, value) => {
    setState((s) => ({ ...s, patient: { ...s.patient, [field]: value } }));
  }, []);

  const setSelection = useCallback((field, value) => {
    setState((s) => ({ ...s, selections: { ...s.selections, [field]: value } }));
  }, []);

  const setNotes = useCallback((notes) => setState((s) => ({ ...s, notes })), []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setState(createInitialState(today()));
  }, []);

  const results = useMemo(() => computeAssessment(state), [state]);

  return { state, results, setPatient, setSelection, setNotes, reset };
}
