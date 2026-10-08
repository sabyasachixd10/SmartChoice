/**
 * Agent Actions Protocol
 * Defines deterministic, strictly structured actions that the Agent can queue 
 * for the Frontend to apply (e.g., to ComparisonContext).
 */

const mongoose = require('mongoose');

class AgentActions {
  /**
   * Action to instruct the frontend to add a product to the comparison view.
   */
  static addProduct(productId) {
    if (!productId) throw new Error('productId is required for ADD_PRODUCT');
    return { 
      type: 'ADD_PRODUCT', 
      payload: { productId: productId.toString() } 
    };
  }

  /**
   * Action to instruct the frontend to remove a product from the comparison view.
   */
  static removeProduct(productId) {
    if (!productId) throw new Error('productId is required for REMOVE_PRODUCT');
    return { 
      type: 'REMOVE_PRODUCT', 
      payload: { productId: productId.toString() } 
    };
  }

  /**
   * Action to instruct the frontend to completely clear the comparison view.
   */
  static clearComparison() {
    return { 
      type: 'CLEAR_COMPARISON', 
      payload: {} 
    };
  }

  /**
   * Basic schema validation
   */
  static validateAction(action) {
    if (!action || typeof action !== 'object') return false;
    
    const validTypes = ['ADD_PRODUCT', 'REMOVE_PRODUCT', 'CLEAR_COMPARISON'];
    if (!validTypes.includes(action.type)) return false;
    
    if (['ADD_PRODUCT', 'REMOVE_PRODUCT'].includes(action.type)) {
      if (!action.payload || typeof action.payload.productId !== 'string') return false;
      if (Object.keys(action.payload).length > 1) return false; // Reject arbitrary props
    }
    
    return true;
  }

  /**
   * Contextual state and DB validation
   */
  static async validateActionContextual(action, session) {
    if (!this.validateAction(action)) return { valid: false, error: 'Malformed action.' };
    
    const activeList = session?.activeComparisonList || [];
    
    if (action.type === 'ADD_PRODUCT') {
      if (activeList.length >= 5) return { valid: false, error: 'Maximum comparison limit of 5 reached.' };
      
      const existsInList = activeList.find(p => p.productId && p.productId.toString() === action.payload.productId);
      if (existsInList) return { valid: false, error: 'Product already in comparison list.' };

      // Optional: Check if it's a valid mongoose ID format before querying
      if (!mongoose.Types.ObjectId.isValid(action.payload.productId)) {
         return { valid: false, error: 'Invalid product ID format.' };
      }
      
      const Product = require('../models/Product');
      const p = await Product.findById(action.payload.productId);
      if (!p) return { valid: false, error: 'Product does not exist in database.' };
    }
    
    if (action.type === 'REMOVE_PRODUCT') {
      const existsInList = activeList.find(p => p.productId && p.productId.toString() === action.payload.productId);
      if (!existsInList) return { valid: false, error: 'Product is not in the comparison list.' };
    }

    return { valid: true };
  }
}

module.exports = AgentActions;
