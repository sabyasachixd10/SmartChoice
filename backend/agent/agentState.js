/**
 * Agent State Definitions
 * Provides canonical structure and safe state updates for the AI Agent.
 */

class AgentState {
  static createInitialState(sessionId, userId = null) {
    return {
      sessionId,
      userId,
      conversation: { messages: [], metadata: {} },
      activeComparisonList: [],
      retrievedProducts: [],
      inputState: { uploadedDocuments: [], barcodeResults: [] },
      userPreferences: null,
      validationWarnings: [],
      lastIntent: null,
      lastToolResults: null
    };
  }

  static formatProductForComparison(product) {
    if (!product) return null;
    return {
      productId: product._id || null,
      barcode: product.identity?.barcode || null,
      name: product.identity?.name || 'Unknown',
      brand: product.identity?.brand || 'Unknown',
      nutrition: product.nutrition || null,
      ingredients: product.ingredients || null,
      processing: product.processing || null,
      smartChoiceScore: product.dataQuality?.dataQualityScore || null,
      source: product.source?.source || 'Unknown',
      validationStatus: product.dataQuality || null
    };
  }
}

module.exports = AgentState;
