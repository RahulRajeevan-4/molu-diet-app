// Vercel serverless function: POST /api/parse-recipe { recipeText } → { items }
// Reads OPENROUTER_API_KEY / OPENROUTER_MODEL from the server environment.
import { handleParseRecipeRequest } from "./_lib/recipeParser.js";

export default function handler(req, res) {
  return handleParseRecipeRequest(req, res, process.env);
}
