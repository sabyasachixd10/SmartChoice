const ragRetrievalService = require('../services/ragRetrievalService');
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

module.exports = {
  getRagContext
};
