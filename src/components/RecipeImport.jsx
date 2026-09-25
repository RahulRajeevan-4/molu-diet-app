import { useState } from "react";
import { parseRecipeWithAI } from "../lib/openrouter.js";
import { matchFoodByName } from "../lib/matchFood.js";
import { hasNutrientData } from "../lib/foodData.js";

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
        const food = matchFoodByName(item.name, {
          prefer: item.type === "fruit" || item.type === "vegetable" ? item.type : null,
        });
        if (!food) {
          notFound.push(item.name);
          continue;
        }
        const grams = item.grams ?? 100;
        toAdd.push({ fruitName: food.common_name, grams });
        added.push({ name: food.common_name, grams, noData: !hasNutrientData(food) });
      }

      if (toAdd.length > 0) onAdd(toAdd);
      setResult({ added, notFound });
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
              <b>Not in the fruit or vegetable datasets:</b> {result.notFound.join(", ")}
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
