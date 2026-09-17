const SORT_OPTIONS = [
  { key: "common_name", label: "Name" },
  { key: "energy_kcal", label: "Energy" },
  { key: "carbohydrate_g", label: "Carbs" },
  { key: "sugars_g", label: "Sugars" },
  { key: "fiber_g", label: "Fibre" },
  { key: "_gi", label: "GI" },
  { key: "potassium_mg", label: "Potassium" },
  { key: "vitamin_c_mg", label: "Vit C" },
  { key: "_confBucket", label: "Confidence" },
];

export default function Toolbar({
  query,
  setQuery,
  giFilter,
  setGiFilter,
  minFiber,
  setMinFiber,
  onlyFlagged,
  setOnlyFlagged,
  sortKey,
  setSortKey,
}) {
  return (
    <div className="toolbar">
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by name, species or region…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search fruits"
        />
      </div>
      <select value={giFilter} onChange={(e) => setGiFilter(e.target.value)} aria-label="Filter by glycemic index">
        <option value="all">All GI levels</option>
        <option value="low">Low GI (&lt;55)</option>
        <option value="medium">Medium GI (55–69)</option>
        <option value="high">High GI (≥70)</option>
        <option value="na">No GI data</option>
      </select>
      <div className="fiber-wrap">
        <span>Min fibre {minFiber}g</span>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={minFiber}
          onChange={(e) => setMinFiber(parseFloat(e.target.value))}
          aria-label="Minimum fibre grams"
        />
      </div>
      <button
        className={"chip-btn" + (onlyFlagged ? " active" : "")}
        onClick={() => setOnlyFlagged((v) => !v)}
      >
        ⚑ Flagged only
      </button>
      <div className="sort-wrap">
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort by">
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
