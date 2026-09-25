// Vercel serverless function: POST /api/not-found.
// Vercel's filesystem is read-only/ephemeral, so nothing is written here; the
// JSON logs are recorded when running `npm run dev` or `npm run preview`.
import { handleNotFoundRequest } from "./_lib/notFoundLog.js";

export default function handler(req, res) {
  return handleNotFoundRequest(req, res, { dir: null });
}
