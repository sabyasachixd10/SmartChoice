# Similarity Engine Architecture

This document describes the design and logic of the SmartChoice Similarity Engine.

## 1. Candidate Retrieval
The similarity engine does **not** compare the target product against the entire database. It first filters the MongoDB database using the `$in` operator to retrieve only products that share at least one category with the target product (excluding the target product itself). This pool of candidates is limited (e.g. to 50 products) to ensure database performance.

## 2. Similarity Formula & Weights
The engine calculates a deterministic similarity score (0-100) based on five main signals. It answers the question "How comparable are these products?" rather than "Which is healthier?".

The overall score is a weighted sum:
- **Category Similarity (40%)**: Calculates the Jaccard similarity between the category arrays.
- **Product Type (20%)**: Exact match on the `productType` field.
- **Serving Size (15%)**: Compares the numerical difference in serving size, penalizing differences up to 50%.
- **Ingredients (15%)**: Uses Jaccard similarity on the normalized ingredient lists.
- **Nutrition (10%)**: Averages the percentage differences of the 8 core nutritional values (calories, protein, carbs, sugar, fat, saturated fat, fiber, sodium).

## 3. Text Similarity (Jaccard)
For array fields like categories and ingredients, text similarity uses the Jaccard Index:
1. Normalization: Lowercase and `trim()`.
2. Tokenization: Array elements act as tokens.
3. Sets: Convert to mathematical sets to find Intersection and Union.
4. Formula: `Size of Intersection / Size of Union`.

*Note: Embeddings and RAG models are out of scope for this phase and will be added later.*

## 4. Explainable Output
Instead of just a number, the service returns readable explanations. Example reasons include:
- "Highly similar ingredient profile"
- "Same product category"
- "Similar serving size"
- "Similar nutritional profile"

## 5. Limitations
- Does not understand synonyms natively (e.g., "Crisps" vs "Chips").
- Assumes missing data fields are incomparable, preventing them from positively contributing to the score.
