// Calls the app's own /api/parse-recipe endpoint, which talks to OpenRouter
// server-side so the API key is never shipped to the browser.
export async function parseRecipeWithAI({ recipeText }) {
  let res;
  try {
    res = await fetch("/api/parse-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeText }),
    });
  } catch {
    throw new Error("Couldn't reach the recipe parser. Check your connection and try again.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Recipe parsing failed (${res.status}).`);
  }
  if (!Array.isArray(data?.items)) {
    throw new Error("The recipe parser returned an unexpected response.");
  }
  return data.items;
}
