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

## Current Limitations
Because the SmartChoice test database currently only contains 12 sample products, queries that do not have a strong semantic match in the dataset will still return the "closest" vectors (though they will now be properly flagged as weak). This is a dataset limitation, not a retrieval algorithm failure, and will self-correct as the product database expands. Future calibration is required once the dataset grows.
