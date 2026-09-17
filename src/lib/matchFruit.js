import { FRUITS } from "./fruitData.js";

function aliases(fruit) {
  return fruit.common_name.split("/").map((s) => s.trim().toLowerCase());
}

export function matchFruitByName(name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;

  for (const fruit of FRUITS) {
    if (aliases(fruit).includes(q)) return fruit;
  }

  let best = null;
  let bestLen = 0;
  for (const fruit of FRUITS) {
    for (const alias of aliases(fruit)) {
      if ((alias.includes(q) || q.includes(alias)) && alias.length > bestLen) {
        best = fruit;
        bestLen = alias.length;
      }
    }
  }
  return best;
}
