// Server-side only. The OpenRouter key must never reach the browser bundle.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const MAX_RECIPE_CHARS = 8000;

const SYSTEM_PROMPT = `You are a nutrition assistant that reads a recipe (an ingredient list and/or freeform cooking instructions) and extracts every fruit, vegetable, or other food ingredient it contains.

For each ingredient, estimate the edible weight in grams for the quantity actually used in the recipe, using standard typical weights for common units (e.g. "1 medium banana" is about 118 g, "2 cups chopped strawberries" is about 300 g, "1 clove garlic" is about 3 g). If no quantity is given, assume a typical single-serving amount.

Respond with ONLY valid JSON, no prose, no markdown code fences, matching exactly this shape:
{"items":[{"name":"banana","type":"fruit","grams":118}]}

"type" must be one of "fruit", "vegetable", or "other". Fresh herbs and leaves (e.g. curry leaves, coriander) and fresh roots such as ginger are "vegetable"; seeds, dried spices and powders (e.g. mustard seed, turmeric powder, asafoetida), grains, pulses, dairy, oils, sugar and salt are "other". "name" must be a common, singular, English name (e.g. "banana", not "bananas" or "Musa spp.").`;

/** Error with an HTTP status to return to the browser. */
export class RecipeParseError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export async function parseRecipe({ apiKey, model, recipeText, referer }) {
  if (!apiKey) {
    throw new RecipeParseError("OpenRouter is not configured on the server (OPENROUTER_API_KEY is missing).", 500);
  }
  if (!model) {
    throw new RecipeParseError("OpenRouter is not configured on the server (OPENROUTER_MODEL is missing).", 500);
  }
  if (typeof recipeText !== "string" || !recipeText.trim()) {
    throw new RecipeParseError("Paste a recipe to parse.", 400);
  }
  if (recipeText.length > MAX_RECIPE_CHARS) {
    throw new RecipeParseError(`Recipe is too long (max ${MAX_RECIPE_CHARS} characters).`, 413);
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(referer ? { "HTTP-Referer": referer } : {}),
      "X-Title": "Clinical Nutrition Reference",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      // Simple extraction: skip the model's thinking step for speed and cost.
      reasoning: { enabled: false },
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: recipeText },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let detail = body.slice(0, 300);
    try {
      detail = JSON.parse(body)?.error?.message || detail;
    } catch {
      // keep raw text
    }
    throw new RecipeParseError(`OpenRouter request failed (${res.status}): ${detail}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new RecipeParseError("The model returned an empty response.");

  let parsed;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new RecipeParseError("Couldn't parse the model's response as JSON.");
  }
  if (!Array.isArray(parsed.items)) {
    throw new RecipeParseError("The model's response didn't include an items list.");
  }

  return parsed.items
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      type: ["fruit", "vegetable", "other"].includes(item.type) ? item.type : "other",
      grams: Number(item.grams) > 0 ? Math.round(Number(item.grams)) : null,
    }));
}

export function extractJson(text) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return cleaned.slice(start, end + 1);
  return cleaned;
}

async function readJsonBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_RECIPE_CHARS * 4) throw new RecipeParseError("Request body too large.", 413);
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

/**
 * Plain Node (req, res) handler, shared by the Vercel function and the Vite
 * dev-server middleware so both behave identically.
 */
export async function handleParseRecipeRequest(req, res, env) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }
  try {
    let body;
    try {
      body = await readJsonBody(req);
    } catch (err) {
      if (err instanceof RecipeParseError) throw err;
      throw new RecipeParseError("Request body must be JSON.", 400);
    }
    const items = await parseRecipe({
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL,
      recipeText: body?.recipeText,
      referer: req.headers?.origin,
    });
    return send(res, 200, { items });
  } catch (err) {
    const status = err instanceof RecipeParseError ? err.status : 500;
    const message = err instanceof RecipeParseError ? err.message : "Unexpected server error.";
    if (!(err instanceof RecipeParseError)) console.error("[parse-recipe]", err);
    return send(res, status, { error: message });
  }
}
