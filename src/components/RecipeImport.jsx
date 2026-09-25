import { useState } from "react";
import { parseRecipeWithAI, logNotFound } from "../lib/openrouter.js";
import { matchFoodByName } from "../lib/matchFood.js";
import { hasNutrientData } from "../lib/foodData.js";

function describeCounts(counts) {
  return [
    ["fruit", "fruit", "fruits"],
    ["vegetable", "vegetable", "vegetables"],
    ["other", "other ingredient", "other ingredients"],
  ]
    .filter(([k]) => counts[k] > 0)
    .map(([k, one, many]) => `${counts[k]} ${counts[k] === 1 ? one : many}`)
    .join(", ");
}

export default function RecipeImport({ onAdd }) {
  const [recipeText, setRecipeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleParse(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!recipeText.trim()) {
      setError("Paste a recipe to parse.");
      return;
    }

    setLoading(true);
    try {
      const items = await parseRecipeWithAI({ recipeText });

      const added = [];
      const notFound = [];
      const toAdd = [];

      // Match every item against both datasets; the model's type only sets the preference,
      // since it sometimes labels spices as vegetables or vice versa.
      for (const item of items) {
        const produce = item.type === "fruit" || item.type === "vegetable";
        const food = matchFoodByName(item.name, { prefer: produce ? item.type : null, exactOnly: !produce });
        if (!food) {
          notFound.push({ name: item.name, type: item.type });
          continue;
        }
        const grams = item.grams ?? 100;
        toAdd.push({ fruitName: food.common_name, grams });
        added.push({ name: food.common_name, grams, noData: !hasNutrientData(food) });
      }

      if (toAdd.length > 0) onAdd(toAdd);
      const log = await logNotFound(notFound);
      setResult({ added, notFound, log });
    } catch (err) {
      setError(err.message || "Something went wrong parsing that recipe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="sidebar-title">Paste a recipe</h2>
      <p className="picker-hint import-intro">
        Paste an ingredient list or freeform recipe text. An AI model, called through
        OpenRouter, reads it, estimates gram quantities, and adds every recognized fruit and
        vegetable to this recipe automatically. Spices, grains, oils and other ingredients
        aren&rsquo;t in the datasets yet and are listed separately.
      </p>

      <form onSubmit={handleParse}>
        <textarea
          className="recipe-textarea"
          placeholder={"Paste your recipe here, e.g.\n2 bananas\n1 cup strawberries, sliced\n1 carrot, grated"}
          value={recipeText}
          onChange={(e) => setRecipeText(e.target.value)}
          rows={6}
        />

        <div className="recipe-actions">
          <button type="submit" className="chip-btn active" disabled={loading}>
            {loading ? "Parsing…" : "Parse with AI"}
          </button>
        </div>
      </form>

      {error && <p className="picker-error">{error}</p>}

      {result && (
        <div className="import-result">
          {result.added.length > 0 && (
            <p className="import-summary">
              <b>Added {result.added.length}:</b>{" "}
              {result.added.map((a, i) => (
                <span key={a.name + i}>
                  {i > 0 && ", "}
                  {a.name} ({a.grams} g){a.noData && <span className="import-summary-muted"> – no nutrient data</span>}
                </span>
              ))}
            </p>
          )}
          {result.notFound.length > 0 && (
            <p className="import-summary import-summary-muted">
              <b>Not in the fruit or vegetable datasets:</b> {result.notFound.map((n) => n.name).join(", ")}
            </p>
          )}
          {result.notFound.length > 0 && result.log && (
            <p className="import-summary import-summary-muted">
              {result.log.recorded
                ? `Saved to ${result.log.file} for dataset review: ${describeCounts(result.log.counts)}.`
                : `Not saved to notfound.json${result.log.reason ? ` (${result.log.reason})` : ""}.`}
            </p>
          )}
          {result.added.length === 0 && result.notFound.length === 0 && (
            <p className="import-summary import-summary-muted">No ingredients recognized.</p>
          )}
        </div>
      )}
    </div>
  );
}
