import { NUTRIENT_FIELDS } from "../lib/nutrients.js";

function fmt(value, unit) {
  if (value == null) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}

export default function RecipeNutritionTable({ rows, totals, servings }) {
  if (rows.length === 0) return null;

  return (
    <div className="card">
      <h2 className="sidebar-title">Nutrition breakdown</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              {NUTRIENT_FIELDS.map((f) => (
                <th key={f.key} className="num">
                  {f.label} ({f.unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  {row.fruitName}{" "}
                  <span className="fruit-sci">
                    {row.grams} g{row.provisional ? " · provisional values" : ""}
                  </span>
                </td>
                {NUTRIENT_FIELDS.map((f) => (
                  <td key={f.key} className="num">
                    {fmt(row.values[f.key], f.unit)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="totals-row">
              <td>Total</td>
              {NUTRIENT_FIELDS.map((f) => (
                <td key={f.key} className="num">
                  {fmt(totals.values[f.key], f.unit)}
                  {totals.incomplete[f.key] ? (
                    <span title="One or more ingredients are missing this value">*</span>
                  ) : null}
                </td>
              ))}
            </tr>
            {servings > 1 && (
              <tr className="totals-row per-serving-row">
                <td>Per serving (&divide;{servings})</td>
                {NUTRIENT_FIELDS.map((f) => (
                  <td key={f.key} className="num">
                    {fmt(
                      totals.values[f.key] == null ? null : totals.values[f.key] / servings,
                      f.unit
                    )}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="nutrition-note">
        * one or more ingredients in this recipe don&rsquo;t have that value recorded.
      </p>
    </div>
  );
}
