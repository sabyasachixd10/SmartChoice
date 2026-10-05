const vectorSearchService = require('./vectorSearchService');
const scoringService = require('./scoringService');
const recommendationService = require('./recommendationService');
const preferenceService = require('./preferenceService');
const ragConfig = require('../config/ragConfig');

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

    const topK = options.topK ? parseInt(options.topK, 10) : ragConfig.RAG_DEFAULT_TOP_K;
    const limit = Math.min(topK, ragConfig.RAG_MAX_RESULTS);
    const rawPrefs = options.preferences || {};
    const prefs = preferenceService.normalizePreferences(rawPrefs);

    // 1. Semantic Retrieval using EXISTING Atlas Vector Search implementation
    const searchResults = await vectorSearchService.semanticProductSearch(query, { limit });

    let strongResults = 0;
    let moderateResults = 0;
    let weakResults = 0;

    // 2. Format products for RAG Context
    const productsContext = searchResults.map(result => {
      const product = result.product;
      const similarityScore = result.semanticScore;

      // Classification
      let classification = 'weak';
      if (similarityScore >= ragConfig.RAG_STRONG_SIMILARITY) {
        classification = 'strong';
        strongResults++;
      } else if (similarityScore >= ragConfig.RAG_MIN_SIMILARITY) {
        classification = 'moderate';
        moderateResults++;
      } else {
        weakResults++;
      }

      const retrievalQuality = {
        classification,
        score: similarityScore,
        threshold: {
          minimum: ragConfig.RAG_MIN_SIMILARITY,
          strong: ragConfig.RAG_STRONG_SIMILARITY
        }
      };

      // Enrich with SmartChoice score
      const scData = scoringService.calculateSmartChoiceScore(product, prefs);

      // Enrich with Preference Match
      const evalResults = recommendationService.evaluatePreferences(product, prefs);
      
      let status = "UNKNOWN";
      if (evalResults.matchCount > 0 && evalResults.noMatchCount === 0) status = "MATCH";
      if (evalResults.noMatchCount > 0) status = "NO_MATCH";

      // Missing data handling helper
      const resolveData = (value) => {
        if (value === null || value === undefined || value === '') {
          return { value: null, availability: "missing" };
        }
        if (Array.isArray(value) && value.length === 0) {
          return { value: null, availability: "missing" };
        }
        if (typeof value === 'object' && Object.keys(value).length === 0) {
          return { value: null, availability: "missing" };
        }
        return { value, availability: "present" };
      };

      return {
        id: product._id.toString(),
        evidence: {
          source: product.source?.source || "OpenFoodFacts",
          sourceType: "external_product_database",
          retrievalMethod: "semantic_vector_search",
          productFacts: {
            source: product.source?.source || "OpenFoodFacts"
          },
          semanticRetrieval: {
            similarityScore: similarityScore,
            relevance: classification
          },
          calculatedMetrics: {
            smartChoiceScore: scData.totalScore
          }
        },
        retrievalQuality,
        grounding: {
          productDataAvailable: true,
          nutritionAvailable: (product.dataQuality?.missingNutritionFields?.length === 0) && !!product.nutrition && Object.keys(product.nutrition).length > 0,
          ingredientsAvailable: (product.ingredients?.ingredients?.length || 0) > 0,
          allergensAvailable: (product.ingredients?.allergens?.length || 0) > 0,
          processingAvailable: !!product.processing?.level,
          overallDataQuality: product.dataQuality || { completeness: 0, missingNutritionFields: [], dataQualityScore: 0 }
        },
        facts: {
          name: resolveData(product.identity?.name).value || "Unknown",
          brand: resolveData(product.identity?.brand).value || "Unknown",
          categories: resolveData(product.identity?.categories).value || [],
          nutrition: resolveData(product.nutrition),
          ingredients: resolveData(product.ingredients?.ingredients),
          additives: resolveData(product.ingredients?.additives),
          allergens: resolveData(product.ingredients?.allergens),
          processing: resolveData(product.processing),
          dietaryLabels: resolveData(product.processing?.labels)
        },
        calculated: {
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
          }
        }
      };
    });

    const hasStrongEvidence = strongResults > 0;
    const hasSufficientEvidence = strongResults > 0 || moderateResults > 0;

    // 3. Assemble final RAG context structure
    return {
      query: {
        text: query.trim(),
        normalized: query.trim().toLowerCase(),
        intent: "unknown"
      },
      retrieval: {
        method: "mongodb_atlas_vector_search",
        index: "product_vector_index",
        model: "sentence-transformers/all-MiniLM-L6-v2",
        topKRequested: limit,
        resultsReturned: searchResults.length,
        strongResults,
        moderateResults,
        weakResults,
        usableResults: searchResults.length,
        hasStrongEvidence,
        hasSufficientEvidence,
        message: hasSufficientEvidence ? "Sufficiently relevant products retrieved." : "No sufficiently relevant products were retrieved for this query."
      },
      groundingPolicy: {
        useOnlyRetrievedProductFacts: true,
        distinguishCalculatedMetrics: true,
        distinguishSimilarityFromQuality: true,
        doNotInventMissingData: true,
        mentionInsufficientEvidence: true
      },
      products: productsContext
    };
  }
}

module.exports = new RagRetrievalService();
