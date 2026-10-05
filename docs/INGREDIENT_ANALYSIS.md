# Ingredient & Additive Analysis Service

## Purpose
The Ingredient & Additive Analysis layer provides a dedicated, reusable, and deterministic service for extracting and analyzing ingredient, additive, and allergen data from normalized SmartChoice products. It separates this concern from general scoring logic, making it available for frontend display, future LLM context generation, and API consumers.

## Architecture
- **Location:** `backend/services/ingredientAnalysisService.js`
- **Controller/Routes:** `GET /api/products/:id/ingredients`
- **Pattern:** Stateless functional service taking a `Product` document as input and returning a deterministic JSON object.

## Input
A fully formed Mongoose `Product` document containing the `ingredients` subdocument (`ingredients.ingredients`, `ingredients.additives`, `ingredients.allergens`).

## Output (Example Response)
```json
{
  "success": true,
  "data": {
    "productId": "1234567890123",
    "ingredientAnalysis": {
      "available": true,
      "ingredientCount": 10,
      "ingredients": [
        {
          "originalName": " Farine de BLÉ ",
          "normalizedName": "Farine de BLÉ",
          "comparisonForm": "farine de blé",
          "position": 1
        }
      ],
      "leadingIngredients": [ ... ]
    },
    "additiveAnalysis": {
      "available": true,
      "additiveCount": 2,
      "additives": [
        {
          "name": "E322",
          "code": "E322",
          "category": "unknown",
          "confidence": "high",
          "source": "OpenFoodFacts"
        }
      ]
    },
    "allergenAnalysis": {
      "available": true,
      "allergenCount": 1,
      "allergens": ["gluten"]
    },
    "findings": [
      "Ingredient data is available.",
      "Product contains 10 ingredients.",
      "Leading ingredients are: Farine de BLÉ, Sucre.",
      "Product contains 2 detected additives.",
      "Product contains 1 detected allergen."
    ],
    "confidence": "high",
    "limitations": []
  }
}
```

## Core Behaviors

### Ingredient Normalization
- **Non-destructive:** The original string is preserved in `originalName`.
- **Trimming:** Extra whitespace is collapsed/trimmed (`normalizedName`).
- **Comparison Form:** Lowercased and punctuation removed (`comparisonForm`) for programmatic string matching.
- **Ordering:** Order from the source dataset is strictly preserved (`position`).

### Additive Detection
- Reuses existing Open Food Facts codes (e.g., `en:e322`).
- Parses standard E-numbers safely.
- Explicitly sets `category: 'unknown'` to prevent inventing unverified classifications.

### Allergen Handling
- Reuses normalized allergen lists.
- Empty allergen arrays set `available: false` because missing data does NOT guarantee the product is allergen-free.

### Missing Data Behavior
- If arrays are empty or undefined, the service gracefully falls back to `available: false` for that specific category.
- Findings reflect this clearly ("Ingredient data is unavailable").
- `limitations` array explicitly captures these gaps to prevent downstream consumers (like an LLM) from hallucinating data.

### Confidence
- `confidence` is 'high' if ingredients are present, 'low' if missing.

### Limitations & Rules
- Do NOT use this service to infer medical or clinical claims.
- Words like "toxic" or "dangerous" are explicitly banned from this layer unless directly ingested from a certified external structured dataset (which is currently not applicable).
