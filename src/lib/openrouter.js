const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are a nutrition assistant that reads a recipe (an ingredient list and/or freeform cooking instructions) and extracts every fruit, vegetable, or other food ingredient it contains.

For each ingredient, estimate the edible weight in grams for the quantity actually used in the recipe, using standard typical weights for common units (e.g. "1 medium banana" is about 118 g, "2 cups chopped strawberries" is about 300 g, "1 clove garlic" is about 3 g). If no quantity is given, assume a typical single-serving amount.

Respond with ONLY valid JSON, no prose, no markdown code fences, matching exactly this shape:
{"items":[{"name":"banana","type":"fruit","grams":118}]}

"type" must be one of "fruit", "vegetable", or "other". "name" must be a common, singular, English name (e.g. "banana", not "bananas" or "Musa spp.").`;

export async function parseRecipeWithAI({ apiKey, model, recipeText }) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Clinical Nutrition Reference",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: recipeText },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response.");

  let parsed;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch {
    throw new Error("Couldn't parse the model's response as JSON.");
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("The model's response didn't include an items list.");
  }

  return parsed.items
    .filter((item) => item && typeof item.name === "string" && item.name.trim())
    .map((item) => ({
      name: item.name.trim(),
      type: ["fruit", "vegetable", "other"].includes(item.type) ? item.type : "other",
      grams: Number(item.grams) > 0 ? Math.round(Number(item.grams)) : null,
    }));
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}
