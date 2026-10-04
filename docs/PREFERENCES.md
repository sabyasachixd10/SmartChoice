# User Preferences

SmartChoice supports a deterministic user preference system that influences product ranking without altering underlying factual data.

## Preference Schema
The `UserPreference` schema accepts boolean, numeric, and array fields.

### Soft Preferences (Rank adjustments)
- `highProtein`
- `lowSugar`
- `lowCalories`
- `lowSaturatedFat`
- `lowSodium`
- `highFiber`
- `preferredBrands` (array)
- `preferredCategories` (array)
- `vegan` / `vegetarian` (dietary flags, evaluated against labels/ingredients)

### Hard Constraints (Eligibility filters)
- `avoidAllergens` (array): Instantly marks a product ineligible if an allergen substring matches.
- `avoidIngredients` (array): Instantly marks a product ineligible if an ingredient substring matches.
- `excludedCategories` (array): Marks category matches as ineligible.
- `excludedBrands` (array): Marks brand matches as ineligible.

## Preference Evaluation States
Every preference is evaluated individually and deterministically results in one of three states:
1. **MATCH**: The product metadata strictly meets the requested preference.
2. **NO_MATCH**: The product metadata explicitly violates the preference.
3. **UNKNOWN**: The product is missing the necessary metadata to make a determination.

Missing data reduces the confidence score of the personalization engine but does not assume a MATCH or NO_MATCH.

## Normalization
User input is fully normalized (`backend/services/preferenceService.js`). Unrecognized fields are stripped. Array strings are lowercased and trimmed. This ensures deterministic matching.
