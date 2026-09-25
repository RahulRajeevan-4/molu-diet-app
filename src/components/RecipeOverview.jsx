import { useMemo, useState } from "react";
import { NUTRIENT_FIELDS } from "../lib/nutrients.js";
import { analyzeRecipe, contributionsFor, DV_GOOD, DV_HIGH } from "../lib/recipeAnalysis.js";

function num(v, dp = 0) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}

/** Small amounts keep one decimal so they don't round to a misleading 0. */
function amount(v) {
  return num(v, v != null && Math.abs(v) < 10 ? 1 : 0);
}

function pctText(p) {
  if (p == null || !Number.isFinite(p)) return "—";
  if (p > 0 && p < 1) return "<1%";
  return `${num(p)}%`;
}

/** Per-mark hover/focus tooltip, positioned inside the chart's figure. */
function useTooltip() {
  const [tip, setTip] = useState(null);
  function bind(content) {
    const show = (e) => {
      const fig = e.currentTarget.closest(".ro-figure").getBoundingClientRect();
      const mark = e.currentTarget.getBoundingClientRect();
      const x = e.clientX ? e.clientX - fig.left : mark.left - fig.left + mark.width / 2;
      setTip({ x: Math.min(Math.max(x, 70), fig.width - 70), y: mark.top - fig.top, content });
    };
    return {
      tabIndex: 0,
      onMouseEnter: show,
      onMouseMove: show,
      onFocus: show,
      onMouseLeave: () => setTip(null),
      onBlur: () => setTip(null),
    };
  }
  const node = tip && (
    <div className="ro-tooltip" role="presentation" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  );
  return [bind, node];
}

function Tile({ label, value, unit }) {
  return (
    <div className="stat ro-tile">
      <div className="n">
        {value} {value !== "—" && unit && <small>{unit}</small>}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

function EnergySources({ macro }) {
  const [bind, tip] = useTooltip();
  return (
    <figure className="ro-figure">
      <figcaption>
        <h3>Where the energy comes from</h3>
        <p>Share of energy from each macronutrient (4 / 4 / 9 kcal per g).</p>
      </figcaption>
      {macro ? (
        <>
          <div className="ro-stack" role="img" aria-label={macro.segments.map((s) => `${s.label} ${pctText(s.share)}`).join(", ")}>
            {macro.segments
              .filter((s) => s.kcal > 0)
              .map((s, i) => (
                <span
                  key={s.key}
                  className={`ro-seg ro-series-${i + 1}`}
                  style={{ flexGrow: s.kcal }}
                  aria-label={`${s.label}: ${amount(s.kcal)} kcal, ${pctText(s.share)}`}
                  {...bind(
                    <>
                      <b>{s.label}</b>
                      <span>
                        {amount(s.kcal)} kcal · {pctText(s.share)}
                      </span>
                    </>
                  )}
                />
              ))}
          </div>
          <ul className="ro-legend">
            {macro.segments.map((s, i) => (
              <li key={s.key}>
                <span className={`ro-swatch ro-series-${i + 1}`} aria-hidden="true" />
                {s.label} <b>{pctText(s.share)}</b>
                <span className="ro-muted"> {amount(s.kcal)} kcal</span>
              </li>
            ))}
          </ul>
          {macro.sugarShare != null && (
            <p className="ro-note">Sugars account for {pctText(macro.sugarShare)} of this energy.</p>
          )}
        </>
      ) : (
        <p className="ro-empty">Needs carbohydrate, protein and fat data for at least one ingredient.</p>
      )}
      {tip}
    </figure>
  );
}

const CONTRIB_NAMES = {
  energy_kcal: "energy",
  sugars_g: "sugars",
  fiber_g: "fibre",
  protein_g: "protein",
  potassium_mg: "potassium",
  vitamin_c_mg: "vitamin C",
};

function Contributions({ rows }) {
  const [key, setKey] = useState("energy_kcal");
  const [bind, tip] = useTooltip();
  const field = NUTRIENT_FIELDS.find((f) => f.key === key);
  const data = useMemo(() => contributionsFor(rows, key), [rows, key]);
  const max = Math.max(0, ...data.map((d) => d.value ?? 0));
  const options = NUTRIENT_FIELDS.filter((f) => f.key in CONTRIB_NAMES);

  return (
    <figure className="ro-figure ro-wide">
      <figcaption>
        <h3>Which ingredient contributes most</h3>
        <p>Total {CONTRIB_NAMES[key]} in the recipe, by ingredient.</p>
      </figcaption>
      <div className="ro-chips" role="radiogroup" aria-label="Nutrient">
        {options.map((f) => (
          <button
            key={f.key}
            type="button"
            role="radio"
            aria-checked={key === f.key}
            className={"chip-btn ro-chip" + (key === f.key ? " active" : "")}
            onClick={() => setKey(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {max > 0 ? (
        <ul className="ro-bars">
          {data.map((d) => (
            <li key={d.name} className="ro-bar-row">
              <span className="ro-bar-label" title={d.name}>
                {d.name}
              </span>
              <span className="ro-bar-track">
                {d.value == null ? (
                  <span className="ro-muted">no data</span>
                ) : (
                  <span className="ro-plot">
                    <span
                      className="ro-bar"
                      style={{ width: `${(d.value / max) * 100}%` }}
                      aria-label={`${d.name}: ${amount(d.value)} ${field.unit}, ${pctText(d.share)}`}
                      {...bind(
                        <>
                          <b>{d.name}</b>
                          <span>
                            {amount(d.value)} {field.unit} from {num(d.grams)} g · {pctText(d.share)} of total
                          </span>
                        </>
                      )}
                    />
                    <span className="ro-bar-value" style={{ left: `${(d.value / max) * 100}%` }}>
                      {amount(d.value)} {field.unit}
                      <span className="ro-muted"> · {pctText(d.share)}</span>
                    </span>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ro-empty">No {CONTRIB_NAMES[key]} data for these ingredients.</p>
      )}
      {tip}
    </figure>
  );
}

function DailyValues({ items, servings }) {
  const [bind, tip] = useTooltip();
  const scaleMax = Math.max(100, ...items.map((d) => Math.min(d.pct, 200)));
  const pos = (p) => `${(Math.min(p, scaleMax) / scaleMax) * 100}%`;
  return (
    <figure className="ro-figure">
      <figcaption>
        <h3>% Daily Value per serving</h3>
        <p>
          {servings > 1 ? `One of ${servings} servings` : "Whole recipe (1 serving)"}, against FDA adult Daily Values.
        </p>
      </figcaption>
      {items.length ? (
        <>
          <ul className="ro-bars ro-dv">
            {items.map((d) => (
              <li key={d.key} className="ro-bar-row">
                <span className="ro-bar-label">{d.label}</span>
                <span className="ro-bar-track">
                  <span className="ro-plot">
                    <span className="ro-ref" style={{ left: pos(100) }} aria-hidden="true" />
                    <span
                      className={"ro-bar" + (d.pct > 0 ? "" : " ro-bar-zero")}
                      style={{ width: pos(d.pct) }}
                      aria-label={`${d.label}: ${pctText(d.pct)} of daily value`}
                      {...bind(
                        <>
                          <b>{d.label}</b>
                          <span>
                            {amount(d.perServing)} {d.unit} of {num(d.dv)} {d.unit} DV · {pctText(d.pct)}
                          </span>
                        </>
                      )}
                    />
                    <span className="ro-bar-value" style={{ left: pos(d.pct) }}>
                      {pctText(d.pct)}{d.pct > 200 ? " ▸" : ""}
                      {d.level && <span className="ro-level">{d.level === "high" ? "High" : "Good source"}</span>}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="ro-note">
            Line marks 100% DV. For fibre, protein, potassium and vitamin C, “High” is ≥ {DV_HIGH}% DV and “Good
            source” {DV_GOOD}–{DV_HIGH - 1}% DV (FDA labelling thresholds). Sugars have no Daily Value.
          </p>
        </>
      ) : (
        <p className="ro-empty">No nutrient data yet for these ingredients.</p>
      )}
      {tip}
    </figure>
  );
}

export default function RecipeOverview({ rows, servings }) {
  const o = useMemo(() => analyzeRecipe(rows, servings), [rows, servings]);
  if (rows.length === 0) return null;
  const ps = o.perServing;

  return (
    <section className="card recipe-overview" aria-labelledby="ro-title">
      <div className="ro-head">
        <h2 className="sidebar-title" id="ro-title">
          Recipe overview
        </h2>
        <p className="ro-coverage">
          Nutrient data for {o.coverage.withData} of {o.ingredientCount} ingredient{o.ingredientCount === 1 ? "" : "s"}
          {o.coverage.gramsShare != null && ` (${num(o.coverage.gramsShare)}% of the weight)`}
        </p>
      </div>

      <div className="stats ro-tiles">
        <Tile label={o.servings > 1 ? "Energy per serving" : "Energy"} value={amount(ps.energy_kcal)} unit="kcal" />
        <Tile label={o.servings > 1 ? "Serving weight" : "Total weight"} value={num(o.gramsPerServing)} unit="g" />
        <Tile label="Energy density" value={num(o.energyDensity)} unit="kcal/100 g" />
        <Tile label="Fibre per serving" value={num(ps.fiber_g, 1)} unit="g" />
        <Tile label="Sugars per serving" value={num(ps.sugars_g, 1)} unit="g" />
      </div>

      {o.insights.length > 0 && (
        <ul className="ro-insights">
          {o.insights.map((i) => (
            <li key={i.id} className={i.tone === "caution" ? "caution" : ""}>
              <span className="ro-insight-tag">{i.tone === "caution" ? "⚠ Check" : "ⓘ Note"}</span>
              {i.text}
            </li>
          ))}
        </ul>
      )}

      <div className="ro-grid">
        <EnergySources macro={o.macroEnergy} />
        <DailyValues items={o.dailyValues} servings={o.servings} />
        <Contributions rows={rows} />
      </div>
      <p className="ro-note">
        Estimates from per-100 g reference values; the full numbers are in the nutrition breakdown table below.
      </p>
    </section>
  );
}
