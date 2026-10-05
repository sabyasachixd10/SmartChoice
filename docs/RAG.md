# Phase 7: Retrieval-Augmented Generation (RAG) Foundation

## Purpose
The RAG Context Layer is the foundation for future LLM-based features in SmartChoice (such as personalized explanations, "Why was this recommended?", or chatbot interfaces).

**Crucial Distinction**: RAG Retrieval is NOT the same thing as Semantic Search.
- **Semantic Search** (Phase 6) operates at the database level to find products matching the *meaning* of a user's query. It returns products.
- **RAG Retrieval** (Phase 7) prepares those retrieved products as *structured, rich context* for a generative language model, applying rigorous data quality, grounding, and separation of concerns.

## Relevance Thresholds and Classification
We classify each semantic search result using engineering heuristics to distinguish between strong matches and weak fallbacks. This is crucial because our current dataset is only 12 products, so the "closest" match mathematically might be logically irrelevant (e.g., retrieving chips when searching for apples).

The relevance thresholds are configured in `backend/config/ragConfig.js`:
- `RAG_MIN_SIMILARITY` = 0.55
- `RAG_STRONG_SIMILARITY` = 0.70

Results are classified as:
- **Strong**: Score >= 0.70
- **Moderate**: 0.55 <= Score < 0.70
- **Weak**: Score < 0.55

**Important Note on Thresholds:**
These thresholds are currently *engineering heuristics*, not scientifically validated boundaries. They must be calibrated against a larger product dataset and evaluation set in the future.

## Handling Insufficient Evidence
If all retrieved products fall below the minimum similarity threshold (i.e., only weak matches), the context will explicitly declare `hasSufficientEvidence: false` and note that no sufficiently relevant products were retrieved. Weak matches are explicitly marked so the future LLM understands they are not authoritative results. 

## Context Separation Principles

### Semantic Similarity vs. SmartChoice Score
Semantic similarity is a retrieval relevance signal, not a measure of product health, nutrition quality, or SmartChoice quality. Just because a product is a 95% semantic match for "cola" does not mean it has a 95% health score. The RAG context explicitly separates these concepts.

### Facts vs. Calculated Metrics
The RAG context structural boundaries make it clear to a future LLM what is a ground truth fact versus what is derived by SmartChoice:
- **Product Facts**: Name, brand, nutrition, ingredients, allergens (e.g., sourced from Open Food Facts).
- **Calculated Metrics**: SmartChoice Score, preference matches, confidence levels.

### Missing Data Policy
We explicitly represent missing information. Missing nutrition data does not equal zero calories, and missing allergens does not mean allergen-free. A missing value is represented deterministically:
`{ "value": null, "availability": "missing" }`
This prevents the future LLM from hallucinating data that isn't present in the source dataset.

## RAG Context Schema Overview
The enriched schema ensures proper grounding, structured evidence, and policy enforcement for the LLM. 
Key new structures include:
- `query`: Contains the normalized query and intent placeholder.
- `retrieval`: Summarizes the retrieval method, classifications, and evidence sufficiency.
- `groundingPolicy`: Explicit instructions/metadata to dictate safe LLM generation behavior.
- `products[].evidence`: Traces the source of the facts, semantic similarity score, and calculated metrics.
- `products[].grounding`: Reflects data quality completeness.
- `products[].facts`: Explicit original data.
- `products[].calculated`: Explicit SmartChoice evaluations.

## Security & Exclusion Principles
The context passed to an LLM must be safe. Therefore, the RAG layer explicitly EXCLUDES:
- **Embedding Arrays**: The 384-dimensional arrays are mathematically meaningless to an LLM prompt, cost unnecessary tokens, and bloat the context window.
- **Secrets**: API keys (like Hugging Face or future LLM keys) and MongoDB connection strings are strictly stripped.

## Retrieval Evaluation

To measure the quality of semantic retrieval and RAG context grounding deterministically, SmartChoice incorporates an offline evaluation framework (`scripts/evaluateRagRetrieval.js`).

### Evaluation Dataset & Methodology
- **Dataset**: `evaluation/ragQueries.json` containing 15 queries covering categories, brand searches, trait requirements (e.g. low sugar, high fiber), and unsupported/out-of-catalog items.
- **Relevance Logic**: Deterministic, case-insensitive keyword and category matching with regex word boundary protection (e.g., preventing "apple" from matching "pineapple").
- **Independence**: Evaluation labels are strictly independent of the SmartChoice Score and raw semantic similarity scores. Neither SmartChoice Score nor similarity score is used as ground truth relevance.

### Evaluation Metrics Defined
1. **Precision@K (K=1, 3, 5)**: Proportion of retrieved products in the top K that are genuinely relevant to the query.
2. **Hit@K (K=1, 3, 5)**: Boolean indicator of whether at least one relevant product appears in the top K results.
3. **Classification Rates**: Percentage of retrieved results falling into `strong` (>=0.70), `moderate` (0.55 - 0.70), or `weak` (<0.55) threshold tiers.
4. **Unsupported Query Rate & Handling**: Measures how out-of-catalog queries (e.g. "fresh apples", "dark chocolate") perform. They return 0 relevant items as expected.
5. **Recall Status (`not_reliable`)**: Recall cannot be reliably calculated because the 12-product sample database does not represent a complete product universe.

### Recalculation Triggers
Evaluation metrics should be recalculated whenever any of the following change:
- Product catalog size or composition
- Embedding model or vector dimensions
- Text construction logic for embedding generation
- Vector index configuration in MongoDB Atlas
- Retrieval thresholds (`RAG_MIN_SIMILARITY`, `RAG_STRONG_SIMILARITY`)
- Relevance matching logic

## Current Limitations
Because the SmartChoice test database currently only contains 12 sample products, queries that do not have a strong semantic match in the dataset will still return the "closest" vectors (though they will now be properly flagged as weak or moderate). This is a dataset limitation, not a retrieval algorithm failure, and will self-correct as the product database expands. Future calibration is required once the dataset grows.

## RAG Query API

A production-ready API endpoint is available to receive natural-language queries and return the grounded RAG context.

**Endpoint:** `POST /api/rag/query`

**Request Body:**
```json
{
  "query": "healthy high fiber breakfast cereal",
  "topK": 5
}
```

**Validation & Security:**
- `query` is required, must be a non-empty string, and is trimmed.
- Excessively long queries (> 500 characters) are rejected.
- `topK` is optional (defaults to 5) and must be an integer between 1 and 10.
- Responses strictly exclude raw vector embeddings, MongoDB URIs, and environment secrets.

**Response Structure (Successful):**
```json
{
  "success": true,
  "data": {
    "query": {
      "text": "healthy high fiber breakfast cereal",
      "normalized": "healthy high fiber breakfast cereal",
      "intent": "unknown"
    },
    "retrieval": {
      "method": "mongodb_atlas_vector_search",
      "hasStrongEvidence": true,
      "hasSufficientEvidence": true
    },
    "answer": {
      "text": "Based on the retrieved products, the item with the highest SmartChoice Score is...",
      "grounded": true,
      "confidence": "high",
      "evidence": {
        "productsUsed": ["product_id_1", "product_id_2"],
        "retrievalQuality": "high"
      }
    },
    "groundingPolicy": {
      "useOnlyRetrievedProductFacts": true
    },
    "products": [
      {
        "id": "...",
        "evidence": { ... },
        "retrievalQuality": { ... },
        "grounding": { ... },
        "facts": { ... },
        "calculated": { ... }
      }
    ]
  }
}
```

**Error Handling:**
Errors are returned as clean JSON responses without stack traces.
```json
{
  "success": false,
  "error": "Query is required and must be a non-empty string."
}
```

## Frontend RAG Interface

A user-facing AI chat interface has been implemented in the React frontend (`frontend/src/pages/RagAssistantPage.jsx`) to consume the `POST /api/rag/query` endpoint.

### Conversation Behavior
The interface provides a chat-like experience where users can ask sequential questions about products, nutrition, and comparisons. The conversation history is maintained entirely in the frontend React state for the duration of the session; there is no persistent backend database chat history in this phase.

### Displaying AI Answers & Products
- **Answers**: The generated Gemini text is rendered alongside an explicit "Grounded in SmartChoice product data" badge when valid products are found.
- **Retrieved Products**: Products returned in the `products` array of the API response are displayed visually as cards under the AI's answer. These cards show the product image, name, brand, SmartChoice score, and retrieval confidence, allowing the user to click through to existing product detail pages.

### Insufficient Evidence Handling
When a user asks about items outside the catalog (e.g., "Best iPhone 15 Pro Max"), the backend responds with a standard payload indicating `hasSufficientEvidence: false`. The frontend gracefully renders a specific warning inline ("Insufficient relevant products found") rather than attempting to present unrelated data as a valid recommendation, ensuring the AI maintains its grounding constraints.
