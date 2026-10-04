# SmartChoice Score Architecture

The SmartChoice Score provides a deterministic 0-100 informational rating for a product based on its factual metadata. 

## 1. Purpose
The SmartChoice Score exists to evaluate a product across multiple nutritional and processing dimensions simultaneously. It is explicitly designed **not** as a medical diagnosis or a universal "health" label, but as an informational comparison metric based on configurable criteria.

## 2. Component Weights
The final score is a weighted composite of 5 dimensions:
- **Nutrition (40%)**: Sugar, Sodium, Saturated Fat, Calories.
- **Ingredients (20%)**: Additive counts, added sugar indicators.
- **Processing (15%)**: Based on NOVA classification (Scale 1-4).
- **Protein/Fiber (15%)**: Specifically rewards high fiber and protein content.
- **Preferences (10%)**: Dynamic weighting based on optional user preferences (e.g. `lowSodium: true`).

## 3. The Formula
```
Final Score = 
  (Nutrition Score × 0.40) +
  (Ingredient Score × 0.20) +
  (Processing Score × 0.15) +
  (Protein/Fiber Score × 0.15) +
  (Preference Score × 0.10)
```

## 4. Sub-Methodologies
- **Nutrition**: Standard baseline thresholds are configured per 100g. Products crossing `high` thresholds incur point penalties (-30 for high sugar, -25 for high sodium).
- **Ingredients**: Starts at 100. Deducts points based on the number of additives (-10 for <=3, -25 for >3) and flags added sugar synonyms ("sugar", "syrup").
- **Processing**: A deterministic mapping of the NOVA group. (NOVA 1 = 100, NOVA 4 = 30). Missing NOVA defaults to a neutral 50.
- **Protein/Fiber**: Starts at a neutral 50. Rewards positive points (+25) for surpassing high thresholds.
- **Preferences**: Starts at a neutral 70. Dynamically checks passed preferences against product metadata (e.g., if `highProtein` is true, it checks if protein > high threshold).

## 5. Confidence Calculation
Data completeness drives the `confidence` score (0-100) and the confidence `level` ("high", "medium", "low").
- Missing calories: -10
- Missing sugar: -15
- Missing saturatedFat: -10
- Missing sodium: -15
- Missing protein: -10
- Missing fiber: -10
- Missing ingredients list: -10
- Missing NOVA classification: -10

## 6. Category-Aware Architecture
Thresholds can optionally be overridden by category. A cascading architecture checks for:
`config.categories[category] -> config.general`
This allows beverages to have stricter calorie and sugar thresholds than snacks.

## 7. Limitations & Missing Data
- **No fabricated values**: If a nutrient is missing, the service handles it cleanly (avoiding NaN) and explicitly adds it to the `limitations` array (e.g., "Missing fiber data"). It does not guess missing data.
- **Ethics**: Output strings clearly differentiate between source data ("Classified as NOVA 4 (Source-provided)") and local evaluations.
