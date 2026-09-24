# Clinical Nutrition Calculator — formula verification record

Registry: `constants/formulas.js` (`FORMULA_REGISTRY_VERSION` 2026-09-24.1). That file is the source of
truth for coefficients, versions, sources and approval status. The in-app **Formula Log** tab renders it.
This document summarises the review of the originally supplied (WhatsApp-transcribed) formulas.

All outputs are **estimates** for clinical decision support, not prescriptions.

## Corrections made to the supplied notes

| Formula | Supplied | Implemented | Reason |
|---|---|---|---|
| Mifflin-St Jeor (women) | … **+161** | … **−161** | Published constant is −161 (Mifflin et al., Am J Clin Nutr 1990). |
| Broca IBW | height in **metres** − 100 | height in **cm** − 100 | Metres would give a negative weight. Simple Broca only; the modified Broca is not used. |

## Awaiting dietitian confirmation (disabled)

| Formula | Supplied | Published variants | Status |
|---|---|---|---|
| Curreri, age ≥ 60 | 20 × wt + **5** × %TBSA | 20 × wt + 65 × %TBSA; 25 × wt + 65 × %TBSA | **Disabled.** 5 kcal/%TBSA is very likely a transcription error for 65, and sources also disagree on the weight coefficient. |

**To enable:** set `FORMULAS["curreri-elderly"].coefficients` to the confirmed `{ perKg, perTbsa }`,
set `status: "approved"`, update `version`/`source`, bump `FORMULA_REGISTRY_VERSION`, and update the
test in `tests/calculators.test.js`.

## Implemented as supplied, with documented notes

- **Harris-Benedict (requested rounded).** Men 66.5 + 13.7W + 5H − 6.7A; women 655.1 + 9.6W + 1.8H − 4.6A.
  These are truncations of the 1919 coefficients (6.755 → 6.7, 4.6756 → 4.6), which usually changes the result
  by less than 10 kcal/day. The original 1919 coefficients are a separately selectable variant, and the two
  coefficient sets are never mixed.
- **Indian BMI classification.** Uses the WHO Asia-Pacific 2000 cut-offs with half-open intervals on the unrounded
  BMI, for adults ≥ 18 only. (Misra 2009 Indian consensus variant: normal from 18.0, no obesity classes. Not used.)
- **Waist circumference.** ≥ 90 cm for men and ≥ 80 cm for women, adults only.
- **Target-BMI IBW.** There is no default target BMI; the dietitian must enter one.
- **Adjusted BW.** IBW + 0.25 × (actual − IBW). It is calculated only when requested, and the IBW source is
  chosen by the dietitian. Obesity eligibility is shown using BMI ≥ 25 (Indian cut-off).
- **TEE.** BMR/REE × activity × stress. No default or suggested factors are built in.
- **Curreri adult (16–59 y).** 25 × usual BW + 40 × %TBSA. The 50 % TBSA cap is an explicit protocol option
  (off by default), and both actual and effective TBSA are shown.
- **Curreri Junior.** RDA + 15/25/40 × %TBSA. The supplied ranges (0–1, 1–3, 4–15 y) overlap at 1 y and leave a
  gap between 3 and 4 y. They are resolved by completed age: < 12 months, 12–47 months, 48–191 months. The RDA
  is always entered by the dietitian as total kcal/day; no RDA values are built in.
- **Energy-based fluid.** 1 mL/kcal, labelled as a maintenance estimate.
- **Parkland-type.** 4 mL × kg × %TBSA over the first 24 h **after injury**, with 50 % in the first 8 h after injury.
  Adults (≥ 16 y) only. The optional injury time shows when each window ends. No rates or orders are generated.

## Age boundaries

- Adult-only equations and cut-offs (BMI and waist classification, HB, Mifflin, Broca): age ≥ 18.
- Burn module adult boundary (Curreri adult, Parkland-type): age ≥ 16. This matches Curreri's 16–59 range
  and Curreri Junior's upper bound of 15 y.
- Age is entered in completed years. Additional months (0–11) are used only below 16.
