import { FRUITS } from "./fruitData.js";
import rawVegetables from "../data/vegetables.json";

const NUTRIENT_FIELDS = [
  { key: "energy_kcal", label: "energy", unit: "kcal", value: (f) => f.nutrients_per_100g.energy_kcal },
  { key: "carbohydrate_g", label: "carbohydrate", unit: "g", value: (f) => f.nutrients_per_100g.carbohydrate_g },
  { key: "sugars_g", label: "sugar", unit: "g", value: (f) => f.nutrients_per_100g.sugars_g },
  { key: "fiber_g", label: "fibre", unit: "g", value: (f) => f.nutrients_per_100g.fiber_g },
  { key: "protein_g", label: "protein", unit: "g", value: (f) => f.nutrients_per_100g.protein_g },
  { key: "fat_g", label: "fat", unit: "g", value: (f) => f.nutrients_per_100g.fat_g },
  { key: "potassium_mg", label: "potassium", unit: "mg", value: (f) => f.nutrients_per_100g.potassium_mg },
  { key: "vitamin_c_mg", label: "vitamin C", unit: "mg", value: (f) => f.nutrients_per_100g.vitamin_c_mg },
  { key: "glycemic_index_typical", label: "glycemic index", unit: "", value: (f) => f.glycemic_index_typical },
];

/**
 * Builds the question pools for one food category. `items` must share the
 * fruit dataset's shape; `group` is the category's classification field.
 */
function makeCategory({ id, label, noun, items, group, groupExplanation, builders, uniqueNotesOnly = false, valueNote = "" }) {
  const nutrientFields = NUTRIENT_FIELDS.filter((field) => items.some((f) => field.value(f) != null));
  // Notes shared by several items can't identify a single answer, so optionally keep only unique ones.
  const noteCounts = new Map();
  for (const f of items) for (const n of f.clinical_notes || []) noteCounts.set(n, (noteCounts.get(n) || 0) + 1);
  const usableNotes = (f) => (f.clinical_notes || []).filter((n) => !uniqueNotesOnly || noteCounts.get(n) === 1);

  return {
    id,
    label,
    noun,
    count: items.length,
    all: items,
    quant: items.filter((f) => (f.data_completeness || "").startsWith("quantitative_core_available")),
    grouped: items.filter((f) => f[group]),
    profiled: items.filter((f) => (f.key_micronutrients || []).length > 0),
    phyto: items.filter((f) => (f.key_phytochemicals || []).length > 0),
    noted: items.filter((f) => usableNotes(f).length > 0),
    group,
    groupExplanation,
    nutrientFields,
    usableNotes,
    valueNote,
    builders,
  };
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleUniqueByValue(pool, n, valueFn) {
  const shuffled = shuffle(pool);
  const seen = new Set();
  const result = [];
  for (const item of shuffled) {
    const v = valueFn(item);
    if (seen.has(v)) continue;
    seen.add(v);
    result.push(item);
    if (result.length === n) break;
  }
  return result;
}

function buildScientificNameQuestion(c) {
  const item = pickRandom(c.all);
  const correct = item.scientific_name;
  const pool = c.all.filter((f) => f.common_name !== item.common_name && f.scientific_name !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.scientific_name).map((f) => f.scientific_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `sci-${item.common_name}`,
    prompt: `What is the scientific name of ${item.common_name}?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${item.common_name} is scientifically named ${correct}.`,
  };
}

function buildRegionQuestion(c) {
  const item = pickRandom(c.all);
  const correct = item.region_note;
  const pool = c.all.filter((f) => f.region_note !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.region_note).map((f) => f.region_note);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `region-${item.common_name}-${correct}`,
    prompt: `${item.common_name} is most commonly associated with which region?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${item.common_name}: ${correct}.`,
  };
}

function buildGroupQuestion(c) {
  const item = pickRandom(c.grouped);
  const correct = item[c.group];
  const pool = c.grouped.filter((f) => f[c.group] !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f[c.group]).map((f) => f[c.group]);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `group-${item.common_name}`,
    prompt: `How is ${item.common_name} classified?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: c.groupExplanation(item.common_name, correct),
  };
}

function buildNutrientExtremeQuestion(c) {
  const field = pickRandom(c.nutrientFields);
  const eligible = c.quant.filter((f) => field.value(f) != null);
  if (eligible.length < 4) return null;
  const picked = shuffle(eligible).slice(0, 4);
  const direction = Math.random() < 0.5 ? "highest" : "lowest";
  const values = picked.map(field.value);
  const target = direction === "highest" ? Math.max(...values) : Math.min(...values);
  const winners = picked.filter((f) => field.value(f) === target);
  if (winners.length !== 1) return null;
  const correct = winners[0];
  const options = shuffle(picked.map((f) => f.common_name));
  const unitSuffix = field.unit ? field.unit : "";
  return {
    id: `nutrient-${field.key}-${direction}-${picked.map((f) => f.common_name).join("-")}`,
    prompt: `Which of these ${c.noun}s has the ${direction} ${field.label} per 100g?`,
    options,
    correctIndex: options.indexOf(correct.common_name),
    explanation: `${correct.common_name}: ${field.value(correct)}${unitSuffix} ${field.label} per 100g among these options.${c.valueNote}`,
  };
}

function buildMicronutrientQuestion(c) {
  const item = pickRandom(c.profiled);
  const micro = pickRandom(item.key_micronutrients);
  const correct = item.common_name;
  const pool = c.profiled.filter(
    (f) => f.common_name !== item.common_name && !(f.key_micronutrients || []).includes(micro)
  );
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `micro-${item.common_name}-${micro}`,
    prompt: `Which ${c.noun} is notably associated with ${micro}?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${item.common_name} lists ${micro} among its key micronutrients.`,
  };
}

function buildPhytochemicalQuestion(c) {
  const item = pickRandom(c.phyto);
  const phyto = pickRandom(item.key_phytochemicals);
  const correct = item.common_name;
  const pool = c.phyto.filter(
    (f) => f.common_name !== item.common_name && !(f.key_phytochemicals || []).includes(phyto)
  );
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `phyto-${item.common_name}-${phyto}`,
    prompt: `Which ${c.noun} is notably associated with the phytochemical "${phyto}"?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${item.common_name} lists "${phyto}" among its key phytochemicals.`,
  };
}

function buildClinicalNoteQuestion(c) {
  const item = pickRandom(c.noted);
  const note = pickRandom(c.usableNotes(item));
  const correct = item.common_name;
  // Distractors must not carry the same note, or the question would have several right answers.
  const pool = c.all.filter((f) => f.common_name !== item.common_name && !(f.clinical_notes || []).includes(note));
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `clinical-${item.common_name}-${note}`,
    prompt: `Which ${c.noun} does this clinical note describe: "${note}"`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `This note is listed under ${item.common_name}.`,
  };
}

const CATEGORIES = {
  fruits: makeCategory({
    id: "fruits",
    label: "Fruits",
    noun: "fruit",
    items: FRUITS,
    group: "fruit_group",
    groupExplanation: (name, group) => `${name} is classified as a ${group}.`,
    builders: [
      buildScientificNameQuestion,
      buildRegionQuestion,
      buildGroupQuestion,
      buildNutrientExtremeQuestion,
      buildNutrientExtremeQuestion,
      buildMicronutrientQuestion,
      buildPhytochemicalQuestion,
      buildClinicalNoteQuestion,
    ],
  }),
  // The vegetable dataset's region notes are a handful of generic phrases and its GI
  // values are all null, so region questions are left out (GI drops out automatically).
  vegetables: makeCategory({
    id: "vegetables",
    label: "Vegetables",
    noun: "vegetable",
    items: rawVegetables,
    group: "vegetable_group",
    groupExplanation: (name, group) => `${name} belongs to the "${group}" group.`,
    uniqueNotesOnly: true,
    valueNote: " (Provisional reference value from the vegetable dataset.)",
    builders: [
      buildScientificNameQuestion,
      buildGroupQuestion,
      buildGroupQuestion,
      buildNutrientExtremeQuestion,
      buildNutrientExtremeQuestion,
      buildMicronutrientQuestion,
      buildPhytochemicalQuestion,
      buildClinicalNoteQuestion,
    ],
  }),
};

/** Buttons on the quiz page. Categories without a dataset yet are listed as unavailable. */
export const QUIZ_CATEGORIES = [
  { id: "fruits", label: "Fruits", count: CATEGORIES.fruits.count, available: true },
  { id: "vegetables", label: "Vegetables", count: CATEGORIES.vegetables.count, available: true },
  { id: "pulses", label: "Pulses", count: 0, available: false },
];

export function generateQuiz(count = 10, categoryId = "fruits") {
  const category = CATEGORIES[categoryId];
  if (!category) throw new Error(`No quiz dataset for category: ${categoryId}`);
  const questions = [];
  const seenIds = new Set();
  let attempts = 0;
  const maxAttempts = count * 60;
  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    const builder = pickRandom(category.builders);
    const q = builder(category);
    if (!q || seenIds.has(q.id)) continue;
    seenIds.add(q.id);
    questions.push(q);
  }
  return questions;
}
