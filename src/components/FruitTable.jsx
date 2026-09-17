import { Fragment } from "react";
import GiPill from "./GiPill.jsx";
import ConfBadge from "./ConfBadge.jsx";
import DetailPanel from "./DetailPanel.jsx";

export const COLUMNS = [
  { key: "common_name", label: "Fruit", sortable: true, sticky: true },
  { key: "energy_kcal", label: "Energy", unit: "kcal", sortable: true, num: true },
  { key: "carbohydrate_g", label: "Carbs", unit: "g", sortable: true, num: true },
  { key: "sugars_g", label: "Sugars", unit: "g", sortable: true, num: true },
  { key: "fiber_g", label: "Fibre", unit: "g", sortable: true, num: true },
  { key: "_gi", label: "GI", sortable: true, num: true },
  { key: "potassium_mg", label: "Potassium", unit: "mg", sortable: true, num: true },
  { key: "vitamin_c_mg", label: "Vit C", unit: "mg", sortable: true, num: true },
  { key: "_confBucket", label: "Confidence", sortable: true },
  { key: "_flagged", label: "Flag", sortable: false },
];

function fmt(value, unit) {
  if (value === null || value === undefined) return <span className="dash">&mdash;</span>;
  const n = unit === "kcal" || unit === "mg" ? Math.round(value * 10) / 10 : value;
  return (
    <>
      {n}
      {unit ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> {unit}</span> : null}
    </>
  );
}

export default function FruitTable({ rows, sortKey, sortDir, onSort, expanded, onToggleRow }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={(col.num ? "num " : "") + (col.sticky ? "sticky-col" : "")}
                onClick={() => onSort(col)}
                style={{ cursor: col.sortable ? "pointer" : "default" }}
              >
                {col.label}
                {col.unit ? ` (${col.unit})` : ""}
                {col.sortable && (
                  <span className={"arrow" + (sortKey === col.key ? "" : " arrow-idle")}>
                    {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length}>
                <div className="empty-state">
                  No fruits match these filters. Try widening the search or resetting fibre/GI
                  filters.
                </div>
              </td>
            </tr>
          )}
          {rows.map((fruit) => {
            const n = fruit.nutrients_per_100g;
            const isOpen = expanded === fruit.common_name;
            return (
              <Fragment key={fruit.common_name}>
                <tr className={"row" + (isOpen ? " expanded" : "")} onClick={() => onToggleRow(fruit.common_name)}>
                  <td className="sticky-col">
                    <span className="fruit-name">{fruit.common_name}</span>
                    <span className="fruit-sci">{fruit.scientific_name}</span>
                  </td>
                  <td className="num">{fmt(n.energy_kcal, "kcal")}</td>
                  <td className="num">{fmt(n.carbohydrate_g, "g")}</td>
                  <td className="num">{fmt(n.sugars_g, "g")}</td>
                  <td className="num">{fmt(n.fiber_g, "g")}</td>
                  <td className="num">
                    <GiPill value={fruit._gi} bucket={fruit._giBucket} />
                  </td>
                  <td className="num">{fmt(n.potassium_mg, "mg")}</td>
                  <td className="num">{fmt(n.vitamin_c_mg, "mg")}</td>
                  <td>
                    <ConfBadge bucket={fruit._confBucket} raw={fruit.data_confidence} />
                  </td>
                  <td>
                    {fruit._flagged ? (
                      <span className="flag-dot" title="Clinical caution noted">
                        ⚑
                      </span>
                    ) : (
                      <span className="dash">—</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="detail-row">
                    <td colSpan={COLUMNS.length}>
                      <DetailPanel fruit={fruit} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
