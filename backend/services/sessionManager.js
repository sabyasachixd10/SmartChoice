const AgentSession = require('../models/AgentSession');
const AgentState = require('../agent/agentState');

class SessionManager {
  /**
   * Retrieves an existing session or creates a new one.
   */
  async getOrCreateSession(sessionId, userId = null) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    let session = await AgentSession.findOne({ sessionId });
    if (!session) {
      const initialState = AgentState.createInitialState(sessionId, userId);
      session = new AgentSession(initialState);
      await session.save();
    }
    return session;
  }

  /**
   * Adds a product to the active comparison list.
   * Ensures no duplicates and max 5 products.
   */
  async addProductToComparison(sessionId, product) {
    const session = await this.getOrCreateSession(sessionId);
    
    // Check limit
    if (session.activeComparisonList.length >= 5) {
      throw new Error('Comparison list is full (max 5 products)');
    }

    // Check duplicate (by productId or barcode)
    const isDuplicate = session.activeComparisonList.some(p => 
      (product._id && p.productId && p.productId.toString() === product._id.toString()) ||
      (product.identity?.barcode && p.barcode && p.barcode === product.identity.barcode)
    );

    if (isDuplicate) {
      throw new Error('Product is already in the comparison list');
    }

    const formattedProduct = AgentState.formatProductForComparison(product);
    session.activeComparisonList.push(formattedProduct);
    await session.save();
    return session;
  }

  /**
   * Removes a product from the comparison list by its ID or barcode.
   */
  async removeProductFromComparison(sessionId, identifier) {
    const session = await this.getOrCreateSession(sessionId);
    session.activeComparisonList = session.activeComparisonList.filter(p => 
      (p.productId && p.productId.toString() !== identifier) &&
      (p.barcode && p.barcode !== identifier)
    );
    await session.save();
    return session;
  }

  /**
   * Clears the entire comparison list.
   */
  async clearComparison(sessionId) {
    const session = await this.getOrCreateSession(sessionId);
    session.activeComparisonList = [];
    await session.save();
    return session;
  }

  /**
   * Updates conversation state (adds a message).
   */
  async addMessage(sessionId, role, content) {
    const session = await this.getOrCreateSession(sessionId);
    session.conversation.messages.push({ role, content, timestamp: new Date() });
    await session.save();
    return session;
  }

  /**
   * Updates the last recognized intent.
   */
  async updateIntent(sessionId, intent) {
    const session = await this.getOrCreateSession(sessionId);
    session.lastIntent = intent;
    await session.save();
    return session;
  }

  /**
   * Records a validation warning.
   */
  async addValidationWarning(sessionId, warning) {
    const session = await this.getOrCreateSession(sessionId);
    session.validationWarnings.push(warning);
    await session.save();
    return session;
  }

  /**
   * Records retrieved products into the session state.
   */
  async recordRetrievedProducts(sessionId, productIds) {
    const session = await this.getOrCreateSession(sessionId);
    // Overwrite or append? Usually overwrite for the current turn
    session.retrievedProducts = productIds;
    await session.save();
    return session;
  }
}

module.exports = new SessionManager();
