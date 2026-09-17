# Fruit Clinical Reference

A sortable, filterable nutrition table for 47 common fruits, built for dietician
counseling. Data sourced from USDA FoodData Central, ICMR-NIN IFCT 2017, and the
Atkinson et al. international glycemic index tables (see `common_fruits_nutrition_research.json`).

## Local development

```bash
npm install
npm run dev
```

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
  App.jsx / App.css
  main.jsx / index.css
```
