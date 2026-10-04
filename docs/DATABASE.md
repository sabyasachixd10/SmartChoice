# Database Architecture

This document describes the database schema, models, and data flows for SmartChoice.

## 1. Product Model Schema
Located at `backend/models/Product.js`.

**Required Fields:**
- `identity`: barcode (unique), name, brand, categories.
- `serving`: servingSize, servingSizeUnit.
- `media`: imageUrl, productUrl.
- `ingredients`: ingredients (array), allergens, additives.
- `nutrition`: per 100g/ml (calories, protein, carbohydrates, sugar, fat, saturatedFat, fiber, sodium).
- `processing`: level, novaGroup.
- `source`: source (e.g. OpenFoodFacts), sourceId.
- `dataQuality`: completeness score.

## 2. MongoDB Collections & Indexes
- **Products**: Stores the normalized product data.
  - Indexes: `identity.barcode` (unique), `identity.name`, `identity.brand`, `identity.categories`, `source.source`, `source.sourceId`.

## 3. Nutrition Normalization
Service: `backend/services/nutritionNormalizationService.js`.
All nutrition values are normalized to a consistent 100g/ml basis. Missing fields are preserved as `null` rather than estimated.

## 4. Data Quality Scoring
Service: `backend/services/dataQualityService.js`.
Provides a basic completeness score based on the presence of 8 critical fields: name, brand, image, ingredients, nutrition, allergens, additives, and processing information.

## 5. Open Food Facts Integration
Service: `backend/services/openFoodFactsService.js`.
Acts as the external data source for unknown products. 
- Handles search and barcode lookup.
- Normalizes raw OFF responses to the SmartChoice Product model.

## 6. Product Retrieval Flow
1. User queries barcode/search term.
2. Controller checks MongoDB first (indexed lookup).
3. If not found or insufficient results, controller calls OpenFoodFacts service.
4. Data is fetched, normalized, and scored.
5. The new product is saved to MongoDB.
6. Unified results are returned to the frontend.
