import { FOODS } from "./foodData.js";

/** Spelling variants and regional names that don't appear as dataset aliases. */
const VARIANTS = [
  [/\b(?:chil(?:i|e|li)s?|hot peppers?)(?: peppers?)?\b/g, "chilli"],
  [/\bcapsicums?\b/g, "bell pepper"],
  [/\blady ?fingers?\b/g, "okra"],
  [/\baubergines?\b/g, "eggplant"],
];

function words(text) {
  let s = text.toLowerCase();
  for (const [re, to] of VARIANTS) s = s.replace(re, to);
  return s.split(/[^a-z]+/).filter(Boolean);
}

/** Singular/plural spellings of a word ("peas" → pea, "berries" → berry, "leaves" → leaf). */
function forms(w) {
  const out = new Set([w]);
  if (w.endsWith("ies")) out.add(w.slice(0, -3) + "y");
  if (w.endsWith("ves")) out.add(w.slice(0, -3) + "f").add(w.slice(0, -3) + "fe");
  if (w.endsWith("es")) out.add(w.slice(0, -2));
  if (w.endsWith("s")) out.add(w.slice(0, -1));
  return out;
}

function wordEq(a, b) {
  if (a === b) return true;
  const fb = forms(b);
  for (const f of forms(a)) if (fb.has(f)) return true;
  return false;
}

/** True when `needle` appears as a run of whole words inside `hay`. */
function containsWords(hay, needle) {
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((w, j) => wordEq(hay[i + j], w))) return true;
  }
  return false;
}

const ENTRIES = FOODS.flatMap((food) =>
  food.common_name.split("/").map((alias) => ({ food, words: words(alias) }))
).filter((e) => e.words.length);

/**
 * Finds the closest fruit or vegetable for a free-text name. Tiers, most to least certain:
 *   1. same words ("strawberries" → Strawberry, "curry leaf" → Curry Leaves)
 *   2. a food name that ends the query ("ripe mango" → Mango, but not "olive oil" → Olive); longest wins
 *   3. "<x>fruit" names ("kiwi" → Kiwifruit)
 *   4. the query as the food's main noun ("bean" → Green Beans, "cherry" → Sweet Cherry)
 *   5. the query anywhere in a food name as whole words ("coriander" → Coriander Leaves)
 * Within a tier, the preferred kind wins, then dataset order (common foods first).
 * No partial-word guesses: unmatched names are reported, not approximated.
 *
 * @param {string} name
 * `exactOnly` limits matching to tier 1 — used for items that aren't produce
 * (e.g. "coconut milk" must not become Coconut).
 *
 * @param {{ prefer?: "fruit" | "vegetable" | null, kinds?: string[], exactOnly?: boolean }} [options]
 */
export function matchFoodByName(name, { prefer = null, kinds = null, exactOnly = false } = {}) {
  const q = words(name ?? "");
  if (!q.length) return null;

  const pool = kinds ? ENTRIES.filter((e) => kinds.includes(e.food.kind)) : ENTRIES;
  const ordered = prefer
    ? [...pool.filter((e) => e.food.kind === prefer), ...pool.filter((e) => e.food.kind !== prefer)]
    : pool;

  const last = (ws) => ws[ws.length - 1];
  const tiers = [
    (e) => e.words.length === q.length && containsWords(e.words, q),
    null, // tier 2 is "longest wins", handled below
    (e) => q.length === 1 && e.words.length === 1 && e.words[0] === `${q[0]}fruit`,
    (e) => wordEq(last(e.words), last(q)) && containsWords(e.words, q),
    (e) => containsWords(e.words, q),
  ];

  for (let t = 0; t < (exactOnly ? 1 : tiers.length); t++) {
    if (t === 1) {
      let best = null;
      for (const e of ordered) {
        const endsQuery = wordEq(last(e.words), last(q)) && containsWords(q, e.words);
        if (endsQuery && (!best || e.words.length > best.words.length)) best = e;
      }
      if (best) return best.food;
      continue;
    }
    const hit = ordered.find(tiers[t]);
    if (hit) return hit.food;
  }
  return null;
}
