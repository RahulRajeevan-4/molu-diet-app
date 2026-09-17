import { FRUITS } from "./fruitData.js";

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

const QUANT_FRUITS = FRUITS.filter((f) => f.data_completeness === "quantitative_core_available");
const GROUPED_FRUITS = FRUITS.filter((f) => f.fruit_group);
const PROFILED_FRUITS = FRUITS.filter((f) => (f.key_micronutrients || []).length > 0);
const PHYTO_FRUITS = FRUITS.filter((f) => (f.key_phytochemicals || []).length > 0);
const NOTED_FRUITS = FRUITS.filter((f) => (f.clinical_notes || []).length > 0);

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

function buildScientificNameQuestion() {
  const fruit = pickRandom(FRUITS);
  const correct = fruit.scientific_name;
  const pool = FRUITS.filter((f) => f.common_name !== fruit.common_name && f.scientific_name !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.scientific_name).map((f) => f.scientific_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `sci-${fruit.common_name}`,
    prompt: `What is the scientific name of ${fruit.common_name}?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${fruit.common_name} is scientifically named ${correct}.`,
  };
}

function buildRegionQuestion() {
  const fruit = pickRandom(FRUITS);
  const correct = fruit.region_note;
  const pool = FRUITS.filter((f) => f.region_note !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.region_note).map((f) => f.region_note);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `region-${fruit.common_name}-${correct}`,
    prompt: `${fruit.common_name} is most commonly associated with which region?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${fruit.common_name}: ${correct}.`,
  };
}

function buildFruitGroupQuestion() {
  const fruit = pickRandom(GROUPED_FRUITS);
  const correct = fruit.fruit_group;
  const pool = GROUPED_FRUITS.filter((f) => f.fruit_group !== correct);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.fruit_group).map((f) => f.fruit_group);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `group-${fruit.common_name}`,
    prompt: `How is ${fruit.common_name} classified?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${fruit.common_name} is classified as a ${correct}.`,
  };
}

function buildNutrientExtremeQuestion() {
  const field = pickRandom(NUTRIENT_FIELDS);
  const eligible = QUANT_FRUITS.filter((f) => field.value(f) != null);
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
    prompt: `Which of these fruits has the ${direction} ${field.label} per 100g?`,
    options,
    correctIndex: options.indexOf(correct.common_name),
    explanation: `${correct.common_name}: ${field.value(correct)}${unitSuffix} ${field.label} per 100g among these options.`,
  };
}

function buildMicronutrientQuestion() {
  const fruit = pickRandom(PROFILED_FRUITS);
  const micro = pickRandom(fruit.key_micronutrients);
  const correct = fruit.common_name;
  const pool = PROFILED_FRUITS.filter(
    (f) => f.common_name !== fruit.common_name && !(f.key_micronutrients || []).includes(micro)
  );
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `micro-${fruit.common_name}-${micro}`,
    prompt: `Which fruit is notably associated with ${micro}?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${fruit.common_name} lists ${micro} among its key micronutrients.`,
  };
}

function buildPhytochemicalQuestion() {
  const fruit = pickRandom(PHYTO_FRUITS);
  const phyto = pickRandom(fruit.key_phytochemicals);
  const correct = fruit.common_name;
  const pool = PHYTO_FRUITS.filter(
    (f) => f.common_name !== fruit.common_name && !(f.key_phytochemicals || []).includes(phyto)
  );
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `phyto-${fruit.common_name}-${phyto}`,
    prompt: `Which fruit is notably associated with the phytochemical "${phyto}"?`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `${fruit.common_name} lists "${phyto}" among its key phytochemicals.`,
  };
}

function buildClinicalNoteQuestion() {
  const fruit = pickRandom(NOTED_FRUITS);
  const note = pickRandom(fruit.clinical_notes);
  const correct = fruit.common_name;
  const pool = NOTED_FRUITS.filter((f) => f.common_name !== fruit.common_name);
  const distractors = sampleUniqueByValue(pool, 3, (f) => f.common_name).map((f) => f.common_name);
  if (distractors.length < 3) return null;
  const options = shuffle([correct, ...distractors]);
  return {
    id: `clinical-${fruit.common_name}-${note}`,
    prompt: `Which fruit does this clinical note describe: "${note}"`,
    options,
    correctIndex: options.indexOf(correct),
    explanation: `This note is listed under ${fruit.common_name}.`,
  };
}

const BUILDERS = [
  buildScientificNameQuestion,
  buildRegionQuestion,
  buildFruitGroupQuestion,
  buildNutrientExtremeQuestion,
  buildNutrientExtremeQuestion,
  buildMicronutrientQuestion,
  buildPhytochemicalQuestion,
  buildClinicalNoteQuestion,
];

export function generateQuiz(count = 10) {
  const questions = [];
  const seenIds = new Set();
  let attempts = 0;
  const maxAttempts = count * 60;
  while (questions.length < count && attempts < maxAttempts) {
    attempts++;
    const builder = pickRandom(BUILDERS);
    const q = builder();
    if (!q || seenIds.has(q.id)) continue;
    seenIds.add(q.id);
    questions.push(q);
  }
  return questions;
}
