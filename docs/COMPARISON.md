# Comparison Engine Architecture

This document outlines the comparative analysis logic used in SmartChoice to compare 2 to 5 products side-by-side.

## 1. Comparison Basis
All numerical nutritional comparisons are performed strictly against a normalized basis of **per 100g** or **per 100ml**. The original serving sizes are displayed for context, but nutritional differences are calculated per 100g to ensure factual, mathematical parity.

## 2. Nutrition Comparison & Difference Detection
The comparison engine extracts 8 core nutritional fields. If exactly two products are compared, the engine calculates the mathematical difference and returns "key factual differences".
Example:
```json
{
  "metric": "protein",
  "productA": 6,
  "productB": 8,
  "difference": 2,
  "unit": "g",
  "statement": "Product B contains 2g more protein per 100g compared to Product A."
}
```
Missing values are explicitly treated as unavailable and do not generate a comparison.

## 3. Ingredient Comparison
Ingredients are normalized and compared to find:
- **Common Ingredients**: Ingredients present in *all* compared products.
- **Unique Ingredients**: Ingredients exclusive to each specific product.
- **Ingredient Counts**: A simple numerical count. *Note: SmartChoice does not assert that fewer ingredients intrinsically mean a healthier product.*

## 4. Additive Comparison
Similar to ingredients, additives are counted and isolated by commonality and uniqueness. Additive strings are preserved as neutral E-numbers (e.g., e150d) without aggressive health claims at this layer.

## 5. Allergen Comparison
Allergens are extracted directly from the source labels. If a product lacks allergen metadata, it is flagged as "Allergen information unavailable/none", ensuring we do not falsely imply a product is allergen-free due to missing data.

## 6. Processing Comparison
This section compares:
- **NOVA Group**: Extracted from Open Food Facts (scale 1-4).
- **Processing Labels**: Source-provided labels indicating processing styles or origins (e.g., "Fabriqué en France").

## 7. Limitations & Constraints
The engine strictly provides *factual comparative analysis*. It does not declare a "winner" or synthesize a "healthiest" product. Final health scoring will be handled by the upcoming SmartChoice Scoring Engine.
