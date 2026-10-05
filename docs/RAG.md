# Phase 7: Retrieval-Augmented Generation (RAG) Foundation

## Purpose
The RAG Context Layer is the foundation for future LLM-based features in SmartChoice (such as personalized explanations, "Why was this recommended?", or chatbot interfaces).

**Crucial Distinction**: RAG Retrieval is NOT the same thing as Semantic Search.
- **Semantic Search** (Phase 6) operates at the database level to find products matching the *meaning* of a user's query. It returns products.
- **RAG Retrieval** (Phase 7) prepares those retrieved products as *structured, rich context* for a generative language model.

## Retrieval Flow
1. **User Query**: The user asks a question or searches for a product (e.g., "healthy high fiber snack").
2. **Semantic Retrieval**: The query is converted into an embedding and sent to MongoDB Atlas Vector Search, which retrieves the Top-K closest product matches based on semantic similarity.
3. **Data Enrichment**: 
   - The SmartChoice Score is calculated dynamically for each retrieved product.
   - Preference matching is evaluated if user preferences are provided.
   - Ingredients, nutrition, additives, and processing information are aggregated.
4. **Context Construction**: The data is formatted into a clean, deterministic JSON object.
5. **Future LLM Layer**: The structured JSON context will be passed to an LLM prompt alongside the user's query to generate an explanation.

## RAG Context Schema
The context returned by `GET /api/rag/context` follows this structure:

```json
{
  "query": "user query",
  "retrieval": {
    "method": "mongodb_atlas_vector_search",
    "index": "product_vector_index",
    "model": "sentence-transformers/all-MiniLM-L6-v2",
    "topK": 5
  },
  "products": [
    {
      "id": "...",
      "name": "...",
      "brand": "...",
      "categories": [],
      "similarityScore": 0.85,
      "smartChoice": {
        "score": 85,
        "confidence": "high",
        "breakdown": {},
        "positiveFactors": [],
        "negativeFactors": []
      },
      "preferenceMatch": {
        "status": "MATCH",
        "isEligible": true,
        "reasons": []
      },
      "nutrition": {},
      "ingredients": [],
      "additives": [],
      "allergens": [],
      "processing": {},
      "dietaryLabels": []
    }
  ]
}
```

## Security & Exclusion Principles
The context passed to an LLM must be safe. Therefore, the RAG layer explicitly EXCLUDES:
- **Embedding Arrays**: The 384-dimensional arrays are mathematically meaningless to an LLM prompt, cost unnecessary tokens, and bloat the context window.
- **Secrets**: API keys (like Hugging Face or future LLM keys) and MongoDB connection strings are strictly stripped.
- **Internal Database IDs**: Excluded where irrelevant (e.g. `__v`, internal versioning).

## Current Limitations
Because the SmartChoice test database currently only contains 12 sample products, queries that do not have a strong semantic match in the dataset will still return the "closest" vectors. For example, a search for "fresh apples" might return "potato crisps" if crisps are the closest concept mathematically present in a 12-item database. This is a dataset limitation, not a retrieval algorithm failure, and will self-correct as the product database expands.
