import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleParseRecipeRequest } from "./api/_lib/recipeParser.js";
import { handleNotFoundRequest } from "./api/_lib/notFoundLog.js";

// Serves the /api routes during `npm run dev` / `npm run preview`, mirroring the
// Vercel functions in api/. Non-VITE_ env vars stay server-side.
function recipeApi() {
  let env = {};
  let root = process.cwd();
  const mount = (server) => {
    server.middlewares.use("/api/parse-recipe", (req, res) => handleParseRecipeRequest(req, res, env));
    // notfound.json is written to the project root.
    server.middlewares.use("/api/not-found", (req, res) => handleNotFoundRequest(req, res, { dir: root }));
  };
  return {
    name: "recipe-api",
    configResolved(config) {
      env = { ...loadEnv(config.mode, config.envDir || process.cwd(), ""), ...process.env };
      root = config.root;
    },
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

export default defineConfig({
  plugins: [react(), recipeApi()],
  server: {
    // Don't reload the page when the not-found log is updated.
    watch: { ignored: ["**/notfound.json"] },
  },
});
