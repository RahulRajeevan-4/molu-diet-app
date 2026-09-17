export default function DetailPanel({ fruit }) {
  const n = fruit.nutrients_per_100g;
  return (
    <div className="detail">
      <div>
        <h4>Identification</h4>
        <p>
          <i>{fruit.scientific_name}</i>
          <br />
          {fruit.form} &middot; {fruit.region_note}
        </p>
        <h4 style={{ marginTop: 12 }}>Additional nutrients</h4>
        <p>
          Water {n.water_g ?? "—"} g &middot; Protein {n.protein_g ?? "—"} g &middot; Fat{" "}
          {n.fat_g ?? "—"} g
        </p>
      </div>
      <div>
        <h4>Key micronutrients</h4>
        <div className="tag-row">
          {(fruit.key_micronutrients || []).map((m, i) => (
            <span className="tag" key={i}>
              {m}
            </span>
          ))}
        </div>
        <h4 style={{ marginTop: 12 }}>Key phytochemicals</h4>
        <div className="tag-row">
          {(fruit.key_phytochemicals || []).map((m, i) => (
            <span className="tag" key={i}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div>
        <h4>Clinical notes</h4>
        <ul>
          {(fruit.clinical_notes || []).map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
        {fruit._flagged && (
          <div className="flag-note" style={{ marginTop: 10 }}>
            ⚑ Counsel with caution — {fruit._flagReasons.length} note
            {fruit._flagReasons.length > 1 ? "s" : ""} above touch on drug interaction, organ
            impairment, allergy, dental or added-sugar risk.
          </div>
        )}
      </div>
      <div>
        <h4>GI &amp; sourcing</h4>
        <p>{fruit.glycemic_category}</p>
        <p className="src-list">
          Confidence: {fruit.data_confidence}
          <br />
          Source: {(fruit.source_basis || []).join("; ")}
        </p>
      </div>
    </div>
  );
}
