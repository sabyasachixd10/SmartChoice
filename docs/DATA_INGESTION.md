# Open Food Facts Product Data Ingestion & Embedding Pipeline

## Overview
The SmartChoice Product Ingestion Pipeline expands the product catalog safely and reproducibly from Open Food Facts into MongoDB Atlas. It applies rigorous schema normalization, data completeness validation, barcode deduplication, and automated 384-dimensional vector embedding generation.

## Ingestion Architecture

```
Open Food Facts API (v2 / search.pl)
             ↓
Category Diversity Batch Fetching (20 Categories)
             ↓
Product Normalization (openFoodFactsService)
  ├── Nutrition Normalization (nutritionNormalizationService)
  └── Data Completeness Scoring (dataQualityService)
             ↓
Data Quality & Completeness Filtering
             ↓
Barcode Deduplication & MongoDB Atlas Upsert (Product model)
             ↓
Product Embedding Pipeline (generateProductEmbeddings.js)
             ↓
MongoDB Atlas Vector Search Index (product_vector_index)
```

## CLI Usage & Options

The ingestion script is located at `scripts/ingestOpenFoodFacts.js`.

### Commands
- **Dry-Run Mode (Validation & Report without DB mutations)**:
  ```bash
  node scripts/ingestOpenFoodFacts.js --limit 20 --dry-run
  ```
- **Live Ingestion (Upserting to MongoDB)**:
  ```bash
  node scripts/ingestOpenFoodFacts.js --limit 500
  ```

### Supported Arguments
- `--limit <N>`: Sets the target number of unique, valid products to accept (default: `500`, max: `1000`).
- `--dry-run`: Fetches, normalizes, validates, and simulates deduplication without writing to MongoDB.

## Data Quality & Filtering Rules
Products retrieved from Open Food Facts are accepted into SmartChoice only if they satisfy strict validation criteria:
1. **Valid Barcode**: Must possess a valid, non-empty GTIN/EAN product code.
2. **Identifiable Name**: Must have a product name and must NOT be marked as `'Unknown Product'`.
3. **Nutrition or Ingredients**: Must possess at least 1 non-null nutrition metric (calories, carbs, sugar, fat, protein, sodium, fiber) OR at least 1 ingredient entry.
4. **Data Completeness Threshold**: Must achieve a data completeness score of at least `15%`.

Incomplete or invalid items are skipped and logged with explicit reason codes (`missing_name`, `missing_barcode`, `missing_nutrition_and_ingredients`, `low_data_quality`).

## Deduplication Strategy
- **Primary Key**: `identity.barcode`
- **Upsert Mechanics**: Uses MongoDB `updateOne({ 'identity.barcode': barcode }, { $set: productData }, { upsert: true })`.
- **Existing Product Safety**:
  - The existing 12 baseline products remain intact.
  - If a barcode matches an existing product in MongoDB, its attributes are updated in-place without creating duplicate records.
  - Collection deletion (`drop()`) is strictly prohibited.

## Safety, Rate-Limiting & Error Resilience
- **API Courtesy**: Introduces intentional delays (200ms–250ms) between category requests to prevent API throttling.
- **Bounded Retries**: Uses exponential backoff (up to 3 retries) when encountering HTTP 503, HTTP 429, or network timeouts.
- **Fault Tolerance**: Malformed individual product payloads are logged and skipped without halting the overall batch ingestion pipeline.

## Ingestion Report
Every execution writes machine-readable statistics to `evaluation/ingestionReport.json`:
```json
{
  "source": "Open Food Facts",
  "startedAt": "2026-10-05T...",
  "completedAt": "2026-10-05T...",
  "dryRun": false,
  "requested": 500,
  "accepted": 500,
  "inserted": 495,
  "updated": 5,
  "duplicates": 93,
  "skipped": 103,
  "errors": 0,
  "categories": { ... },
  "skipReasons": { ... }
}
```

## Embedding Workflow
- **Script**: `scripts/generateProductEmbeddings.js`
- **Model**: `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
- **Incremental Embedding**: Evaluates existing product documents. If a product already possesses a valid 384-dimensional vector matching the current model and text hash, it is **reused** and NOT regenerated. Only newly ingested or modified products generate new embeddings.

## Vector Search Index Workflow
- **Index Name**: `product_vector_index`
- **Path**: `embedding.vector`
- **Similarity Metric**: Cosine (384 dimensions)
MongoDB Atlas Vector Search automatically indexes new product embeddings as they are written into the collection.

## Dataset Limitations & Future Recommendations
- The expanded catalog (~500+ items) dramatically improves category coverage across drinks, snacks, dairy, cereals, bakery, frozen foods, and produce.
- Community-sourced Open Food Facts items may exhibit variable ingredient/allergen granularity.
- Evaluation metrics should be re-run after major product additions.
