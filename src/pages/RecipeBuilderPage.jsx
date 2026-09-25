import { useEffect, useMemo, useState } from "react";
import { FOODS, FOOD_BY_NAME } from "../lib/foodData.js";
import { matchFoodByName } from "../lib/matchFood.js";
import { NUTRIENT_FIELDS } from "../lib/nutrients.js";
import RecipeNutritionTable from "../components/RecipeNutritionTable.jsx";
import RecipeImport from "../components/RecipeImport.jsx";
import RecipeOverview from "../components/RecipeOverview.jsx";

const STORAGE_KEY = "molu_recipes";
let nextIngredientId = 1;

function loadSavedRecipes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function emptyDraft() {
  return { id: null, name: "", servings: 1, ingredients: [] };
}

export default function RecipeBuilderPage() {
  const [savedRecipes, setSavedRecipes] = useState(loadSavedRecipes);
  const [draft, setDraft] = useState(emptyDraft);
  const [pickerName, setPickerName] = useState("");
  const [pickerGrams, setPickerGrams] = useState(100);
  const [pickerError, setPickerError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedRecipes));
  }, [savedRecipes]);

  function addIngredient(e) {
    e.preventDefault();
    const match = FOOD_BY_NAME.get(pickerName.trim()) ?? matchFoodByName(pickerName);
    if (!match) {
      setPickerError(`"${pickerName}" isn't in the fruit or vegetable datasets. Pick a suggestion from the dropdown.`);
      return;
    }
    const grams = Number(pickerGrams);
    if (!grams || grams <= 0) {
      setPickerError("Enter a quantity greater than 0g.");
      return;
    }
    setDraft((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients,
        { id: nextIngredientId++, fruitName: match.common_name, grams },
      ],
    }));
    setPickerName("");
    setPickerGrams(100);
    setPickerError("");
  }

  function updateGrams(id, grams) {
    setDraft((d) => ({
      ...d,
      ingredients: d.ingredients.map((ing) => (ing.id === id ? { ...ing, grams } : ing)),
    }));
  }

  function removeIngredient(id) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((ing) => ing.id !== id) }));
  }

  function addIngredientsBulk(items) {
    setDraft((d) => ({
      ...d,
      ingredients: [
        ...d.ingredients,
        ...items.map((it) => ({ id: nextIngredientId++, fruitName: it.fruitName, grams: it.grams })),
      ],
    }));
  }

  function saveRecipe() {
    const name = draft.name.trim() || "Untitled recipe";
    if (draft.id) {
      setSavedRecipes((list) =>
        list.map((r) => (r.id === draft.id ? { ...draft, name, savedAt: Date.now() } : r))
      );
    } else {
      const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const saved = { ...draft, id, name, savedAt: Date.now() };
      setSavedRecipes((list) => [...list, saved]);
      setDraft(saved);
    }
  }

  function loadRecipe(recipe) {
    setDraft({ ...recipe, ingredients: recipe.ingredients.map((ing) => ({ ...ing })) });
  }

  function deleteRecipe(id) {
    setSavedRecipes((list) => list.filter((r) => r.id !== id));
    if (draft.id === id) setDraft(emptyDraft());
  }

  function newRecipe() {
    setDraft(emptyDraft());
  }

  const rows = useMemo(() => {
    return draft.ingredients.map((ing) => {
      // `fruitName` is the stored key for any ingredient (kept for saved-recipe compatibility).
      const food = FOOD_BY_NAME.get(ing.fruitName);
      const factor = ing.grams / 100;
      const values = {};
      NUTRIENT_FIELDS.forEach((field) => {
        const per100 = food?.nutrients_per_100g?.[field.key];
        values[field.key] = per100 == null ? null : per100 * factor;
      });
      return {
        id: ing.id,
        fruitName: ing.fruitName,
        grams: ing.grams,
        kind: food?.kind ?? null,
        provisional: Boolean(food?.provisional),
        values,
      };
    });
  }, [draft.ingredients]);

  const totals = useMemo(() => {
    const values = {};
    const incomplete = {};
    NUTRIENT_FIELDS.forEach((field) => {
      let sum = 0;
      let hasAny = false;
      let missing = false;
      rows.forEach((row) => {
        const v = row.values[field.key];
        if (v == null) {
          missing = true;
        } else {
          sum += v;
          hasAny = true;
        }
      });
      values[field.key] = hasAny ? sum : null;
      incomplete[field.key] = missing;
    });
    return { values, incomplete };
  }, [rows]);

  return (
    <div className="wrap">
      <p className="eyebrow">Recipe builder</p>
      <h1 className="headline">Combine fruits &amp; vegetables and auto-calculate nutrition</h1>
      <p className="sub">
        Add ingredients with a quantity in grams and the table below totals the nutrition
        automatically, using the per-100g fruit and vegetable reference datasets.
      </p>

      <div className="recipe-layout">
        <div className="recipe-main">
          <RecipeImport onAdd={addIngredientsBulk} />

          <div className="card">
            <div className="card-header">
              <input
                className="recipe-name-input"
                type="text"
                placeholder="Recipe name (e.g. Morning fruit bowl)"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
              <label className="servings-field">
                Servings
                <input
                  type="number"
                  min="1"
                  value={draft.servings}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, servings: Math.max(1, Number(e.target.value) || 1) }))
                  }
                />
              </label>
            </div>

            <form className="ingredient-picker" onSubmit={addIngredient}>
              <input
                type="text"
                list="food-options"
                placeholder="Search fruit or vegetable…"
                value={pickerName}
                onChange={(e) => {
                  setPickerName(e.target.value);
                  setPickerError("");
                }}
                aria-label="Ingredient name"
              />
              <datalist id="food-options">
                {FOODS.map((f) => (
                  <option key={f.common_name} value={f.common_name} />
                ))}
              </datalist>
              <input
                type="number"
                min="1"
                value={pickerGrams}
                onChange={(e) => setPickerGrams(e.target.value)}
                aria-label="Quantity in grams"
                className="grams-input"
              />
              <span className="unit-label">g</span>
              <button type="submit" className="chip-btn active">
                + Add ingredient
              </button>
            </form>
            {pickerError && <p className="picker-error">{pickerError}</p>}
            <p className="picker-hint">
              Fruits and vegetables are available. Spices, grains, pulses, dairy and oils aren&rsquo;t in
              the datasets yet.
            </p>

            {draft.ingredients.length === 0 ? (
              <div className="empty-state recipe-empty">
                No ingredients yet. Search above to add the first one.
              </div>
            ) : (
              <table className="ingredient-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th className="num">Grams</th>
                    <th className="num">Energy</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.fruitName}</td>
                      <td className="num">
                        <input
                          type="number"
                          min="1"
                          className="grams-input"
                          value={row.grams}
                          onChange={(e) => updateGrams(row.id, Number(e.target.value) || 0)}
                        />
                      </td>
                      <td className="num">
                        {row.values.energy_kcal == null ? (
                          <span className="dash">no data</span>
                        ) : (
                          `${Math.round(row.values.energy_kcal)} kcal`
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => removeIngredient(row.id)}
                          aria-label={`Remove ${row.fruitName}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="recipe-actions">
              <button type="button" className="chip-btn active" onClick={saveRecipe}>
                {draft.id ? "Update recipe" : "Save recipe"}
              </button>
              <button type="button" className="chip-btn" onClick={newRecipe}>
                New recipe
              </button>
            </div>
          </div>

          <RecipeOverview rows={rows} servings={draft.servings} />

          <RecipeNutritionTable rows={rows} totals={totals} servings={draft.servings} />
        </div>

        <aside className="recipe-sidebar">
          <h2 className="sidebar-title">Saved recipes</h2>
          {savedRecipes.length === 0 ? (
            <p className="sidebar-empty">Recipes you save stay in this browser.</p>
          ) : (
            <ul className="saved-recipe-list">
              {savedRecipes
                .slice()
                .sort((a, b) => b.savedAt - a.savedAt)
                .map((r) => (
                  <li key={r.id} className={"saved-recipe" + (draft.id === r.id ? " active" : "")}>
                    <button type="button" className="saved-recipe-name" onClick={() => loadRecipe(r)}>
                      {r.name}
                      <span className="saved-recipe-meta">
                        {r.ingredients.length} ingredient{r.ingredients.length === 1 ? "" : "s"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="saved-recipe-delete"
                      onClick={() => deleteRecipe(r.id)}
                      aria-label={`Delete ${r.name}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
