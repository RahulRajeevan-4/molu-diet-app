import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleParseRecipeRequest } from "./api/_lib/recipeParser.js";

// Serves /api/parse-recipe during `npm run dev` / `npm run preview`, mirroring the
// Vercel function in api/parse-recipe.js. Non-VITE_ env vars stay server-side.
function recipeApi() {
  let env = {};
  const mount = (server) => {
    server.middlewares.use("/api/parse-recipe", (req, res) => handleParseRecipeRequest(req, res, env));
  };
  return {
    name: "recipe-api",
    configResolved(config) {
      env = { ...loadEnv(config.mode, config.envDir || process.cwd(), ""), ...process.env };
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  plugins: [react(), recipeApi()],
});
