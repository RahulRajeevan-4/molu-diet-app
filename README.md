# Fruit Clinical Reference

A sortable, filterable nutrition table for 47 common fruits, built for dietician
counseling. Data sourced from USDA FoodData Central, ICMR-NIN IFCT 2017, and the
Atkinson et al. international glycemic index tables (see `common_fruits_nutrition_research.json`).

## Local development

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Clinical Nutrition Calculator

`/calculator` — BMI & Indian classification, waist cut-offs, Harris-Benedict / Mifflin-St Jeor,
IBW (Broca, target BMI), adjusted BW, TEE, Curreri burn energy, energy-based and Parkland-type
fluid estimates, printable summary. Pure calculation logic lives in `src/clinical-nutrition/`
and is separate from the UI. See `src/clinical-nutrition/CLINICAL_FORMULAS.md` for formula
verification and the equations awaiting dietitian confirmation. Assessments are session-only
(sessionStorage): the app has no patient-record backend.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Vercel

```bash
npx vercel
```

Or connect the repo at [vercel.com/new](https://vercel.com/new) — Vercel auto-detects
the Vite framework preset, so no config is needed. Build command: `npm run build`,
output directory: `dist`.

## Project structure

```
src/
  data/fruits.json       # nutrition dataset (47 fruits)
  utils/deriveFruit.js   # GI bucketing, confidence bucketing, clinical-flag detection
  components/
    Toolbar.jsx           # search + GI/fibre/flag filters
    StatsRow.jsx          # summary tiles
    FruitTable.jsx        # sortable table + expandable rows
    DetailPanel.jsx       # per-fruit clinical detail
    GiPill.jsx, ConfBadge.jsx
  pages/NutritionCalculatorPage.jsx   # clinical nutrition calculator route
  clinical-nutrition/
    calculators/          # pure formula functions (anthropometry, energy, bodyWeight, burns, fluids)
    constants/            # formula registry (sources, versions, approval), thresholds, field metadata
    assessment.js         # unified computeAssessment() + record/summary builders
    hooks/ components/    # React state hook and UI sections
    tests/                # vitest unit tests
  App.jsx / App.css
  main.jsx / index.css
```
