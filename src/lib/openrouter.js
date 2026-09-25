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

/**
 * Sends every unmatched ingredient (with the AI's type) to /api/not-found, which
 * appends it to notfound.json (dev and preview servers only).
 * Never throws: logging must not break the import.
 */
export async function logNotFound(items) {
  const payload = items.filter((i) => i && i.name);
  if (!payload.length) return { recorded: false, skipped: true };
  try {
    const res = await fetch("/api/not-found", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload.map(({ name, type }) => ({ name, type })) }),
    });
    const data = await res.json().catch(() => null);
    return res.ok && data ? data : { recorded: false, reason: data?.error || `HTTP ${res.status}` };
  } catch {
    return { recorded: false, reason: "network error" };
  }
}
