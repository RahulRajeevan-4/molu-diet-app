import { describe, it, expect } from "vitest";
import { matchFoodByName } from "./matchFood.js";

const match = (q, prefer) => matchFoodByName(q, { prefer })?.common_name ?? null;

describe("matchFoodByName — fruits", () => {
  it.each([
    ["banana", "Banana"],
    ["Mango", "Mango"],
    ["gold kiwifruit", "Gold Kiwifruit"],
    ["mosambi", "Sweet Lime / Mosambi"],
    ["kiwi", "Kiwifruit"],
    ["cherry", "Sweet Cherry"],
    ["ripe mango", "Mango"],
    ["green apple", "Apple"],
    ["pineapple", "Pineapple"],
    ["lemon", "Lemon"],
    ["strawberries", "Strawberry"],
    ["blueberries", "Blueberry"],
    ["mangoes", "Mango"],
    ["grape", "Grapes"],
  ])("%s → %s", (query, expected) => {
    expect(match(query, "fruit")).toBe(expected);
  });
});

describe("matchFoodByName — vegetables (from a real pasted recipe)", () => {
  it.each([
    ["carrot", "Carrot"],
    ["pea", "Green Peas"],
    ["bean", "Green Beans / French Beans"],
    ["onion", "Onion"],
    ["ginger", "Ginger"],
    ["chili", "Green Chilli"],
    ["chili pepper", "Green Chilli"],
    ["green chillies", "Green Chilli"],
    ["curry leaf", "Curry Leaves"],
    ["turmeric", "Fresh Turmeric"],
    ["coriander", "Coriander Leaves / Cilantro"],
    ["tomatoes", "Tomato"],
    ["capsicum", "Bell Pepper - Green"],
    ["palak", "Spinach / Palak"],
  ])("%s → %s", (query, expected) => {
    expect(match(query, "vegetable")).toBe(expected);
  });

  it("finds exact matches even when the AI picked the wrong type", () => {
    expect(match("lemon", "vegetable")).toBe("Lemon");
    expect(match("carrot", "fruit")).toBe("Carrot");
  });

  it("does not guess from partial words", () => {
    expect(match("pea", "fruit")).toBe("Green Peas"); // not Peach / Pear / Pearl Onion
    expect(match("lemon", "vegetable")).not.toBe("Lemongrass");
  });
});

describe("matchFoodByName — no match", () => {
  it.each(["oat", "oil", "salt", "mustard seed", "asafetida", "honey", "yogurt", "cardamom", "   ", ""])(
    "%j → null",
    (query) => {
      expect(match(query)).toBeNull();
    }
  );

  it("can be limited to one kind", () => {
    expect(matchFoodByName("carrot", { kinds: ["fruit"] })).toBeNull();
  });
});
