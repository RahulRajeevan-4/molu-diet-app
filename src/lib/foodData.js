import { FRUITS } from "./fruitData.js";
import rawVegetables from "../data/vegetables.json";

/**
 * Every ingredient the Recipe Builder can use. Names are unique across both
 * datasets, so the common name is the lookup key. Vegetable nutrient values are
 * marked provisional by their dataset.
 */
export const FOODS = [
  ...FRUITS.map((f) => ({ ...f, kind: "fruit", provisional: false })),
  ...rawVegetables.map((v) => ({
    ...v,
    kind: "vegetable",
    provisional: (v.data_completeness || "").includes("provisional"),
  })),
];

export const FOOD_BY_NAME = new Map(FOODS.map((f) => [f.common_name, f]));

export function hasNutrientData(food) {
  return Object.values(food?.nutrients_per_100g ?? {}).some((v) => v != null);
}
