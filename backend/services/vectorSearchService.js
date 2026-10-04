const Product = require('../models/Product');
const embeddingService = require('./embeddingService');

class VectorSearchService {
  /**
   * Performs semantic product search using MongoDB Atlas Vector Search.
   * @param {string} query - The search query text
   * @param {Object} options - Search options { limit }
   * @returns {Promise<Array>} - Array of results with semanticScore
   */
  async semanticProductSearch(query, options = {}) {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Search query must be a non-empty string.');
    }

    if (query.length > 200) {
      throw new Error('Search query is too long.');
    }

    const limit = options.limit ? parseInt(options.limit, 10) : 10;
    if (isNaN(limit) || limit <= 0 || limit > 100) {
      throw new Error('Invalid limit option.');
    }

    // Generate embedding for the query
    const queryVector = await embeddingService.generateEmbedding(query);
    if (!queryVector || !queryVector.length) {
      throw new Error('Failed to generate query embedding.');
    }

    const numCandidates = limit * 10; // Rule of thumb: numCandidates should be 10x limit

    // Execute Atlas Vector Search aggregation
    const pipeline = [
      {
        $vectorSearch: {
          index: "product_vector_index",
          path: "embedding.vector",
          queryVector: queryVector,
          numCandidates: numCandidates,
          limit: limit
        }
      },
      {
        $project: {
          _id: 1,
          identity: 1,
          serving: 1,
          media: 1,
          ingredients: 1,
          nutrition: 1,
          processing: 1,
          source: 1,
          dataQuality: 1,
          semanticScore: { $meta: "vectorSearchScore" } // Extract semantic similarity score
        }
      }
    ];

    const results = await Product.aggregate(pipeline);
    
    // Structure results to return consistent format: { product, semanticScore }
    return results.map(doc => {
      const score = doc.semanticScore;
      delete doc.semanticScore; // Remove from product object
      return {
        product: doc,
        semanticScore: score
      };
    });
  }
}

module.exports = new VectorSearchService();
