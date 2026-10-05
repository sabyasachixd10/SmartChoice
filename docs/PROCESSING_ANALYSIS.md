# Processing Analysis Service

## Purpose
The Processing Analysis layer is a dedicated, reusable, and deterministic service that extracts and formats information about how a food product was processed. It isolates processing logic from general scoring to provide structured insights suitable for the frontend UI, analytical reporting, and RAG/LLM contexts.

## Architecture
- **Location:** `backend/services/processingAnalysisService.js`
- **Controller/Routes:** `GET /api/products/:id/processing`
- **Pattern:** Stateless functional service taking a `Product` document as input and returning a deterministic JSON object.

## Input Data
A fully formed Mongoose `Product` document containing the `processing` and `identity` subdocuments (`processing.novaGroup`, `processing.labels`, `identity.categories`).

## Core Behaviors

### NOVA Handling
If the product contains a trusted `novaGroup` integer (1-4), it is explicitly mapped to its internationally recognized description:
- 1 = Unprocessed or minimally processed foods
- 2 = Processed culinary ingredients
- 3 = Processed foods
- 4 = Ultra-processed foods
- **Source/Confidence:** Mapped as `source-provided` from Open Food Facts.

### Processing Indicators
Extracts tags directly from `processing.labels` provided by the source. These typically include structural tags like "organic", "vegetarian", etc.

### Preparation/Cooking Handling
Scans the combined `labels` and `categories` array against a predefined strict list of preparation keywords (`fried`, `baked`, `roasted`, `boiled`, `air-fried`, `grilled`, `steamed`, `smoked`).
- **Strict Logic:** Does NOT infer cooking methods from ingredients. It only flags a method if the explicit word is used as a categorization tag by the source dataset.

### Missing-Data Behavior
- **NOVA Missing:** Explicitly handled as `{ available: false, value: null }`. 
- **Cooking Method Missing:** Explicitly handled as `{ available: false, methods: [] }`.
- Missing data is NEVER automatically converted into a negative or punitive classification. `limitations` strings explicitly flag what is missing to prevent hallucination by downstream consumers.

### Confidence / Source Handling
- `confidence` defaults to `'high'` only when a source-provided NOVA classification is available. Otherwise, it defaults to `'low'`.
- `source` properties explicitly dictate where the data originated (e.g., `'Open Food Facts'`).

## Limitations & Rules
- Do NOT make medical or clinical claims.
- The service does NOT classify NOVA 4 foods automatically as "unhealthy", "toxic", or "dangerous". It maintains clinical neutrality.

## API Endpoint
**GET** `/api/products/:id/processing`

## Example Response
```json
{
  "success": true,
  "data": {
    "productId": "1234567890123",
    "nova": {
      "available": true,
      "group": 3,
      "label": "Processed foods",
      "source": "Open Food Facts",
      "confidence": "source-provided"
    },
    "processingIndicators": {
      "available": true,
      "indicators": ["vegetarian", "green-dot", "fr:triman"]
    },
    "preparation": {
      "available": false,
      "methods": []
    },
    "findings": [
      "NOVA classification available.",
      "Product classified as NOVA 3 (Processed foods).",
      "Processing metadata available.",
      "Preparation method unavailable."
    ],
    "limitations": [],
    "confidence": "high"
  },
  "message": "Processing analysis completed successfully"
}
```
