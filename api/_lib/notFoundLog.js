// Records ingredients the recipe importer couldn't find, so they can be added
// to the datasets later. notfound.json is a list of { name, times_seen }, most
// frequent first.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { HttpError, readJsonBody, send } from "./http.js";

export const NOT_FOUND_FILE = "notfound.json";

/** The AI's classification — reported back to the page, not stored in the file. */
export const TYPES = Object.freeze(["fruit", "vegetable", "other"]);

const MAX_ITEMS = 50;
const MAX_NAME = 80;

/** Case-, spacing- and simple-plural-insensitive key, so "Dragon fruits" and "dragon fruit" merge. */
export function nameKey(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/(ies)$/, "y")
    .replace(/(?<![s])s$/, "");
}

/** Validates the request list. Unknown types are recorded as "other". */
export function cleanItems(items) {
  if (!Array.isArray(items)) throw new HttpError("items must be a list.", 400);
  if (items.length > MAX_ITEMS) throw new HttpError(`At most ${MAX_ITEMS} items per request.`, 413);
  return items
    .filter((i) => i && typeof i.name === "string")
    .map((i) => ({
      name: i.name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME),
      type: TYPES.includes(i.type) ? i.type : "other",
    }))
    .filter((i) => i.name);
}

/** Existing entries from the file: the current list format, or the older { items: [...] } format. */
function existingEntries(doc) {
  const list = Array.isArray(doc) ? doc : Array.isArray(doc?.items) ? doc.items : [];
  return list
    .filter((e) => e && typeof e.name === "string" && e.name.trim())
    .map((e) => ({ name: e.name.trim().toLowerCase(), times_seen: Number(e.times_seen) > 0 ? Number(e.times_seen) : 1 }));
}

/** Pure merge: adds sightings ({ name }) to the log. Returns [{ name, times_seen }], most frequent first. */
export function mergeLog(doc, items) {
  const byKey = new Map();
  const add = (name, n) => {
    const key = nameKey(name);
    const entry = byKey.get(key);
    if (entry) entry.times_seen += n;
    else byKey.set(key, { name: name.toLowerCase(), times_seen: n });
  };
  for (const e of existingEntries(doc)) add(e.name, e.times_seen);
  for (const { name } of items) add(name, 1);
  return [...byKey.values()].sort((a, b) => b.times_seen - a.times_seen || a.name.localeCompare(b.name));
}

async function readLog(file) {
  try {
    const text = await readFile(file, "utf8");
    return text.trim() ? JSON.parse(text) : null; // an empty file is an empty log
  } catch (err) {
    if (err.code === "ENOENT") return null;
    // A hand-edited file with a JSON error is kept aside rather than overwritten.
    if (err instanceof SyntaxError) {
      await rename(file, `${file}.corrupt-${Date.now()}`);
      return null;
    }
    throw err;
  }
}

// Serialise writes so concurrent requests can't lose each other's updates.
let queue = Promise.resolve();

/**
 * @param {string} dir  directory that holds notfound.json
 * @returns {Promise<{ fruit: number, vegetable: number, other: number }>} names recorded by type
 */
export function recordNotFound(dir, items) {
  const run = async () => {
    const counts = { fruit: 0, vegetable: 0, other: 0 };
    if (!items.length) return counts;
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, NOT_FOUND_FILE);
    const doc = mergeLog(await readLog(file), items);
    const tmp = `${file}.tmp-${process.pid}`;
    await writeFile(tmp, JSON.stringify(doc, null, 2) + "\n", "utf8");
    await rename(tmp, file);
    for (const i of items) counts[i.type] += 1;
    return counts;
  };
  const result = queue.then(run, run);
  queue = result.catch(() => {});
  return result;
}

/**
 * POST /api/not-found { items: [{ name, type: "fruit"|"vegetable"|"other" }] }
 * `dir` is null where the filesystem isn't persistent (e.g. Vercel); the request
 * then succeeds with recorded: false.
 */
export async function handleNotFoundRequest(req, res, { dir }) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }
  try {
    let body;
    try {
      body = await readJsonBody(req, 32 * 1024);
    } catch (err) {
      if (err instanceof HttpError) throw err;
      throw new HttpError("Request body must be JSON.", 400);
    }
    const items = cleanItems(body?.items);
    if (!dir) {
      return send(res, 200, { recorded: false, reason: "This deployment can't write files." });
    }
    const counts = await recordNotFound(dir, items);
    return send(res, 200, { recorded: true, counts, file: NOT_FOUND_FILE });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (!(err instanceof HttpError)) console.error("[not-found]", err);
    return send(res, status, { error: err instanceof HttpError ? err.message : "Couldn't record missing items." });
  }
}
