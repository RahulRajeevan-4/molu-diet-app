const FLAG_KEYWORDS = [
  "kidney",
  "ckd",
  "interact with multiple medicines",
  "cyp3a4",
  "allergy",
  "allergen",
  "fodmap",
  "neurotoxicity",
  "pathogens",
  "added sugar",
  "enamel",
  "should not replace",
  "supplements should not be assumed",
  "diabetes should not replace",
];

export function giBucket(value) {
  if (value === null || value === undefined) return "na";
  if (value < 55) return "low";
  if (value < 70) return "medium";
  return "high";
}

export function confBucket(dataConfidence) {
  const c = (dataConfidence || "").toLowerCase();
  if (c.startsWith("high")) return "high";
  if (c.startsWith("mod")) return "moderate";
  return "other";
}

export function deriveFruit(fruit) {
  const notes = fruit.clinical_notes || [];
  const flagReasons = notes.filter((note) =>
    FLAG_KEYWORDS.some((keyword) => note.toLowerCase().includes(keyword))
  );

  return {
    ...fruit,
    _gi: fruit.glycemic_index_typical,
    _giBucket: giBucket(fruit.glycemic_index_typical),
    _confBucket: confBucket(fruit.data_confidence),
    _flagged: flagReasons.length > 0,
    _flagReasons: flagReasons,
  };
}

export function getSortValue(fruit, key) {
  if (key in fruit.nutrients_per_100g) return fruit.nutrients_per_100g[key];
  return fruit[key];
}
