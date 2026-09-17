import { useState } from "react";
import { parseRecipeWithAI } from "../lib/openrouter.js";
import { matchFruitByName } from "../lib/matchFruit.js";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "openai/gpt-4o-mini";

export default function RecipeImport({ onAdd }) {
  const [recipeText, setRecipeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleParse(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!API_KEY) {
      setError(
        "No OpenRouter API key configured. Set VITE_OPENROUTER_API_KEY in .env and restart the dev server."
      );
      return;
    }
    if (!recipeText.trim()) {
      setError("Paste a recipe to parse.");
      return;
    }

    setLoading(true);
    try {
      const items = await parseRecipeWithAI({ apiKey: API_KEY, model: MODEL, recipeText });

      const added = [];
      const skipped = [];
      const toAdd = [];

      for (const item of items) {
        if (item.type !== "fruit") {
          skipped.push({ name: item.name, reason: `${item.type} — not supported yet` });
          continue;
        }
        const fruit = matchFruitByName(item.name);
        if (!fruit) {
          skipped.push({ name: item.name, reason: "not in the fruit dataset" });
          continue;
        }
        const grams = item.grams ?? 100;
        toAdd.push({ fruitName: fruit.common_name, grams });
        added.push({ name: fruit.common_name, grams });
      }

      if (toAdd.length > 0) onAdd(toAdd);
      setResult({ added, skipped });
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
        OpenRouter, reads it, estimates gram quantities, and adds every recognized fruit to
        this recipe automatically.
      </p>

      <form onSubmit={handleParse}>
        <textarea
          className="recipe-textarea"
          placeholder={"Paste your recipe here, e.g.\n2 bananas\n1 cup strawberries, sliced\n1 tbsp honey"}
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
              Added {result.added.length} ingredient{result.added.length === 1 ? "" : "s"}:{" "}
              {result.added.map((a) => `${a.name} (${a.grams}g)`).join(", ")}
            </p>
          )}
          {result.skipped.length > 0 && (
            <p className="import-summary import-summary-muted">
              Not added: {result.skipped.map((s) => `${s.name} — ${s.reason}`).join("; ")}
            </p>
          )}
          {result.added.length === 0 && result.skipped.length === 0 && (
            <p className="import-summary import-summary-muted">No ingredients recognized.</p>
          )}
        </div>
      )}
    </div>
  );
}
