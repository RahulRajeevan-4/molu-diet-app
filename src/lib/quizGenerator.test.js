import { describe, it, expect } from "vitest";
import { generateQuiz, QUIZ_CATEGORIES } from "./quizGenerator.js";
import vegetables from "../data/vegetables.json";
import pulseData from "../data/pulses.json";
import { FRUITS } from "./fruitData.js";

const DATA = { fruits: FRUITS, vegetables, pulses: pulseData.pulses };
const RUNS = 30;

function byName(items) {
  return new Map(items.map((i) => [i.common_name, i]));
}

describe.each(["fruits", "vegetables", "pulses"])("%s quiz", (categoryId) => {
  const items = DATA[categoryId];
  const lookup = byName(items);

  it.each([5, 10, 15, 20])("generates %i unique, well-formed questions", (n) => {
    for (let run = 0; run < RUNS; run++) {
      const quiz = generateQuiz(n, categoryId);
      expect(quiz).toHaveLength(n);
      expect(new Set(quiz.map((q) => q.id)).size).toBe(n);
      for (const q of quiz) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.correctIndex).toBeGreaterThanOrEqual(0);
        expect(q.correctIndex).toBeLessThan(4);
      }
    }
  });

  it("every question has exactly one correct option according to the data", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const q of generateQuiz(20, categoryId)) {
        const correct = q.options[q.correctIndex];
        const type = q.id.split("-")[0];
        if (type === "clinical") {
          const note = q.prompt.match(/describe: "(.*)"$/)[1];
          const matching = q.options.filter((o) => (lookup.get(o).clinical_notes || []).includes(note));
          expect(matching).toEqual([correct]);
        } else if (type === "micro" || type === "phyto") {
          const field = type === "micro" ? "key_micronutrients" : "key_phytochemicals";
          const term = type === "micro" ? q.prompt.match(/associated with (.*)\?$/)[1] : q.prompt.match(/"(.*)"/)[1];
          const matching = q.options.filter((o) =>
            (lookup.get(o)[field] || []).some((t) => t === term || t.startsWith(term + " ") || term.startsWith(t + " "))
          );
          expect(matching).toEqual([correct]);
        } else if (type === "sci") {
          const name = q.prompt.match(/scientific name of (.*)\?$/)[1];
          expect(correct).toBe(lookup.get(name).scientific_name);
        }
      }
    }
  });
});

describe("vegetable quiz", () => {
  it("uses vegetable wording and never asks region questions", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const q of generateQuiz(20, "vegetables")) {
        expect(q.id.startsWith("region-")).toBe(false);
        expect(q.prompt).not.toMatch(/\bfruits?\b/);
      }
    }
  });

  it("marks nutrient values as provisional", () => {
    const nutrientQs = Array.from({ length: RUNS }, () => generateQuiz(20, "vegetables"))
      .flat()
      .filter((q) => q.id.startsWith("nutrient-"));
    expect(nutrientQs.length).toBeGreaterThan(0);
    for (const q of nutrientQs) expect(q.explanation).toMatch(/Provisional/);
  });
});

describe("pulse quiz", () => {
  it("never asks region or clinical-note questions", () => {
    for (let run = 0; run < RUNS; run++) {
      for (const q of generateQuiz(20, "pulses")) {
        expect(q.id.startsWith("region-")).toBe(false);
        expect(q.id.startsWith("clinical-")).toBe(false);
      }
    }
  });
});

describe("quiz categories", () => {
  it("lists fruits, vegetables and pulses as available", () => {
    const byId = Object.fromEntries(QUIZ_CATEGORIES.map((c) => [c.id, c]));
    expect(byId.fruits).toMatchObject({ available: true, count: 264 });
    expect(byId.vegetables).toMatchObject({ available: true, count: 287 });
    expect(byId.pulses).toMatchObject({ available: true, count: 174 });
  });

  it("refuses categories without a dataset", () => {
    expect(() => generateQuiz(10, "nuts")).toThrow(/No quiz dataset/);
  });
});
