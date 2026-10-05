const vectorSearchService = require('./vectorSearchService');
const scoringService = require('./scoringService');
const recommendationService = require('./recommendationService');
const preferenceService = require('./preferenceService');

class RagRetrievalService {
  /**
   * Retrieves products and formats them for LLM RAG context.
   * @param {string} query - The user query for semantic search
   * @param {Object} options - Options containing topK and preferences
   */
  async retrieveRagContext(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Valid search query is required for RAG context retrieval.');
    }

    const topK = options.topK ? parseInt(options.topK, 10) : 5;
    const rawPrefs = options.preferences || {};
    const prefs = preferenceService.normalizePreferences(rawPrefs);

    // 1. Semantic Retrieval using EXISTING Atlas Vector Search implementation
    const searchResults = await vectorSearchService.semanticProductSearch(query, { limit: topK });

    // 2. Format products for RAG Context
    const productsContext = searchResults.map(result => {
      const product = result.product;
      const similarityScore = result.semanticScore;

      // Enrich with SmartChoice score
      const scData = scoringService.calculateSmartChoiceScore(product, prefs);

      // Enrich with Preference Match
      const evalResults = recommendationService.evaluatePreferences(product, prefs);
      
      let status = "UNKNOWN";
      if (evalResults.matchCount > 0 && evalResults.noMatchCount === 0) status = "MATCH";
      if (evalResults.noMatchCount > 0) status = "NO_MATCH";

      return {
        id: product._id.toString(),
        name: product.identity?.name || "Unknown",
        brand: product.identity?.brand || "Unknown",
        categories: product.identity?.categories || [],
        similarityScore: similarityScore,
        smartChoice: {
          score: scData.totalScore,
          confidence: scData.confidence.level,
          breakdown: scData.breakdown,
          positiveFactors: scData.positiveFactors,
          negativeFactors: scData.negativeFactors
        },
        preferenceMatch: {
          status: status,
          isEligible: evalResults.isEligible,
          reasons: evalResults.results.map(r => r.reason)
        },
        nutrition: product.nutrition || {},
        ingredients: product.ingredients?.ingredients || [],
        additives: product.ingredients?.additives || [],
        allergens: product.ingredients?.allergens || [],
        processing: product.processing || {},
        dietaryLabels: product.processing?.labels || []
      };
    });

    // 3. Assemble final RAG context structure
    return {
      query: query.trim(),
      retrieval: {
        method: "mongodb_atlas_vector_search",
        index: "product_vector_index",
        model: "sentence-transformers/all-MiniLM-L6-v2",
        topK: topK
      },
      products: productsContext
    };
  }
}

module.exports = new RagRetrievalService();
