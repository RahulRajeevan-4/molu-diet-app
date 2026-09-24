import { useState } from "react";
import { useAssessment } from "../clinical-nutrition/hooks/useAssessment.js";
import OverviewSection from "../clinical-nutrition/components/OverviewSection.jsx";
import AnthropometrySection from "../clinical-nutrition/components/AnthropometrySection.jsx";
import EnergySection from "../clinical-nutrition/components/EnergySection.jsx";
import BodyWeightSection from "../clinical-nutrition/components/BodyWeightSection.jsx";
import BurnSection from "../clinical-nutrition/components/BurnSection.jsx";
import FluidSection from "../clinical-nutrition/components/FluidSection.jsx";
import SummarySection from "../clinical-nutrition/components/SummarySection.jsx";
import FormulaLogSection from "../clinical-nutrition/components/FormulaLogSection.jsx";
import "../clinical-nutrition/clinical-nutrition.css";

const TABS = [
  { id: "overview", label: "Overview", Component: OverviewSection },
  { id: "anthropometry", label: "BMI & Anthropometry", Component: AnthropometrySection },
  { id: "energy", label: "Energy Requirements", Component: EnergySection },
  { id: "weight", label: "Ideal & Adjusted Body Weight", Component: BodyWeightSection },
  { id: "burn", label: "Burn Nutrition", Component: BurnSection },
  { id: "fluid", label: "Fluid Requirements", Component: FluidSection },
  { id: "summary", label: "Assessment Summary", Component: SummarySection },
  { id: "formulas", label: "Formula Log", Component: FormulaLogSection },
];

export default function NutritionCalculatorPage() {
  const a = useAssessment();
  const [tab, setTab] = useState("overview");
  const [confirmReset, setConfirmReset] = useState(false);
  const { Component } = TABS.find((t) => t.id === tab);

  function goTo(id) {
    setTab(id);
    window.scrollTo({ top: 0 });
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 4000);
      return;
    }
    a.reset();
    setConfirmReset(false);
    setTab("overview");
  }

  return (
    <div className="wrap cn-page">
      <div className="no-print">
        <p className="eyebrow">Clinical nutrition calculator</p>
        <h1 className="headline">Nutritional assessment</h1>
        <p className="sub">
          Anthropometry, energy, body-weight, burn and fluid estimates from one set of patient details, with each
          equation, version and calculation shown.
        </p>
        <div className="scope-note">
          <b>Estimates, not prescriptions.</b> Results support professional judgement and are not orders.{" "}
          <b>Session-only:</b> this app has no patient-record system. The assessment is kept only in this browser tab
          and is cleared when the tab is closed or reset. Use Print or Download record to keep a copy.
        </div>
      </div>

      <div className="cn-tabs no-print" role="tablist" aria-label="Calculator sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={"chip-btn" + (tab === t.id ? " active" : "")}
            onClick={() => goTo(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className={"chip-btn cn-reset" + (confirmReset ? " confirm" : "")} onClick={handleReset}>
          {confirmReset ? "Click again to clear all" : "Reset"}
        </button>
      </div>

      <div className="cn-body" role="tabpanel">
        <Component a={a} goTo={goTo} />
      </div>
    </div>
  );
}
