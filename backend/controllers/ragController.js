const ragRetrievalService = require('../services/ragRetrievalService');
const llmService = require('../services/llmService');
const ragConfig = require('../config/ragConfig');
const sessionManager = require('../services/sessionManager');
const Product = require('../models/Product');
const agentOrchestrator = require('../services/agentOrchestrator');

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
    const { query, topK, sessionId, activeProductIds } = req.body;

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
    console.log(`[RAG API] Processing query via Orchestrator: "${trimmedQuery.substring(0, 50)}${trimmedQuery.length > 50 ? '...' : ''}"`);

    const orchestratorPayload = {
      sessionId,
      message: trimmedQuery,
      activeProductIds,
      attachments: [], // OCR handling can be injected here later
      barcode: null, // Barcode lookup injected here later
      metadata: { topK: parsedTopK }
    };

    const responsePayload = await agentOrchestrator.processRequest(orchestratorPayload);

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
