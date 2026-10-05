const ragRetrievalService = require('../services/ragRetrievalService');
const llmService = require('../services/llmService');
const ragConfig = require('../config/ragConfig');

// @desc    Get RAG context for a query
// @route   GET /api/rag/context?q=...&topK=...
// @access  Public
const getRagContext = async (req, res, next) => {
  try {
    const query = req.query.q;
    const topK = req.query.topK ? parseInt(req.query.topK, 10) : ragConfig.RAG_DEFAULT_TOP_K;
    
    // Parse preferences if passed via query (e.g. ?prefs={"highProtein":true})
    let preferences = {};
    if (req.query.prefs) {
      try {
        preferences = JSON.parse(req.query.prefs);
      } catch (err) {
        console.warn('Failed to parse preferences from query:', err.message);
      }
    }

    if (!query || query.trim().length === 0) {
      res.status(400);
      throw new Error('Query is required');
    }

    const context = await ragRetrievalService.retrieveRagContext(query, { topK, preferences });

    res.json(context);
  } catch (error) {
    next(error);
  }
};

// @desc    Process a POST RAG query
// @route   POST /api/rag/query
// @access  Public
const postRagQuery = async (req, res, next) => {
  try {
    const { query, topK } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Query is required and must be a non-empty string.' });
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 500) {
      return res.status(400).json({ success: false, error: 'Query exceeds maximum allowed length of 500 characters.' });
    }

    let parsedTopK = ragConfig.RAG_DEFAULT_TOP_K;
    if (topK !== undefined) {
      const k = parseInt(topK, 10);
      if (isNaN(k) || k < 1 || k > 10) {
        return res.status(400).json({ success: false, error: 'topK must be an integer between 1 and 10.' });
      }
      parsedTopK = k;
    }

    // Add safe request logging
    console.log(`[RAG API] Processing query: "${trimmedQuery.substring(0, 50)}${trimmedQuery.length > 50 ? '...' : ''}" (topK: ${parsedTopK})`);

    const context = await ragRetrievalService.retrieveRagContext(trimmedQuery, { topK: parsedTopK });
    
    let answer = null;
    try {
      answer = await llmService.generateAnswer(trimmedQuery, context);
    } catch (llmError) {
      console.error(`[LLM Service Error] ${llmError.message}`);
      // If LLM fails (e.g. missing API key, rate limit), we return a clear error in the answer block
      // but still return the retrieved context.
      answer = {
        text: "I'm sorry, I am currently unable to generate an answer due to a configuration or service error.",
        grounded: false,
        confidence: "insufficient",
        evidence: null,
        error: llmError.message.includes('GEMINI_API_KEY') ? 'Configuration Error' : 'Generation Failed'
      };
      
      // If the error was missing API key, return 500 or 503, but the requirement says:
      // "If the API key is missing, the API must return a clear configuration error rather than fabricate an answer."
      if (llmError.message.includes('GEMINI_API_KEY')) {
        return res.status(503).json({ success: false, error: "AI generation is not configured (missing GEMINI_API_KEY)." });
      }
    }

    const responsePayload = {
      query: context.query,
      retrieval: context.retrieval,
      answer: answer,
      groundingPolicy: context.groundingPolicy,
      products: context.products
    };

    res.status(200).json({ success: true, data: responsePayload });
  } catch (error) {
    console.error(`[RAG API Error] ${error.message}`);
    if (error.message.includes('Valid search query is required') || error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    // Clean JSON error response
    res.status(500).json({ success: false, error: 'An unexpected error occurred during RAG context retrieval.' });
  }
};

module.exports = {
  getRagContext,
  postRagQuery
};
