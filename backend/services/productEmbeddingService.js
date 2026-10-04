const crypto = require('crypto');
const embeddingService = require('./embeddingService');
const Product = require('../models/Product');

const EMBEDDING_CONFIG = {
  model: process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
  version: "v1" // Increment if logic for building text changes
};

class ProductEmbeddingService {
  /**
   * Deterministically builds the embedding input text for a product.
   * Excludes metadata and dynamic scores.
   * @param {Object} product - Product document
   * @returns {string} - Formatted text string for embedding
   */
  buildProductEmbeddingText(product) {
    if (!product) return '';

    const parts = [];

    if (product.identity) {
      if (product.identity.name) parts.push(`Product: ${product.identity.name}`);
      if (product.identity.brand) parts.push(`Brand: ${product.identity.brand}`);
      if (product.identity.productType) parts.push(`Type: ${product.identity.productType}`);
      if (product.identity.categories && product.identity.categories.length > 0) {
        parts.push(`Categories: ${product.identity.categories.join(', ')}`);
      }
    }

    if (product.ingredients) {
      if (product.ingredients.ingredients && product.ingredients.ingredients.length > 0) {
        parts.push(`Ingredients: ${product.ingredients.ingredients.join(', ')}`);
      }
      if (product.ingredients.allergens && product.ingredients.allergens.length > 0) {
        parts.push(`Allergens: ${product.ingredients.allergens.join(', ')}`);
      }
      if (product.ingredients.additives && product.ingredients.additives.length > 0) {
        parts.push(`Additives: ${product.ingredients.additives.join(', ')}`);
      }
    }

    if (product.nutrition) {
      const n = product.nutrition;
      const nutParts = [];
      if (n.calories !== undefined) nutParts.push(`${n.calories}kcal calories`);
      if (n.protein !== undefined) nutParts.push(`${n.protein}g protein`);
      if (n.carbohydrates !== undefined) nutParts.push(`${n.carbohydrates}g carbs`);
      if (n.sugar !== undefined) nutParts.push(`${n.sugar}g sugar`);
      if (n.fat !== undefined) nutParts.push(`${n.fat}g fat`);
      if (n.fiber !== undefined) nutParts.push(`${n.fiber}g fiber`);
      if (n.sodium !== undefined) nutParts.push(`${n.sodium}mg sodium`);
      
      if (nutParts.length > 0) {
        parts.push(`Nutrition per 100g: ${nutParts.join(', ')}`);
      }
    }

    if (product.processing) {
      if (product.processing.novaGroup) parts.push(`Processing: NOVA ${product.processing.novaGroup}`);
      if (product.processing.labels && product.processing.labels.length > 0) {
        parts.push(`Dietary Labels: ${product.processing.labels.join(', ')}`);
      }
    }

    return parts.join('\n').trim();
  }

  /**
   * Generates a hash for the embedding text to detect changes.
   * @param {string} text - The formatted text
   * @returns {string} - SHA-256 hash
   */
  _hashText(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generates a new embedding for a product, replacing the old one.
   * Does NOT save the product to the DB automatically.
   * @param {Object} product - Product document
   * @returns {Promise<Object>} - The updated product
   */
  async generateProductEmbedding(product) {
    const text = this.buildProductEmbeddingText(product);
    if (!text) {
      throw new Error('Cannot generate embedding text for product');
    }

    const textHash = this._hashText(text);
    const vector = await embeddingService.generateEmbedding(text);
    
    product.embedding = {
      vector,
      model: EMBEDDING_CONFIG.model,
      dimensions: vector.length,
      version: EMBEDDING_CONFIG.version,
      textHash,
      generatedAt: new Date()
    };

    return product;
  }

  /**
   * Ensures the product has a valid, up-to-date embedding.
   * Reuses existing if valid and unchanged.
   * @param {Object} product - Product document
   * @param {boolean} forceSave - If true, calls product.save() when modified
   * @returns {Promise<boolean>} - True if embedding was generated/updated, false if reused
   */
  async ensureProductEmbedding(product, forceSave = false) {
    const text = this.buildProductEmbeddingText(product);
    if (!text) return false;
    
    const textHash = this._hashText(text);

    const isCurrent = 
      product.embedding &&
      product.embedding.vector &&
      product.embedding.vector.length > 0 &&
      product.embedding.model === EMBEDDING_CONFIG.model &&
      product.embedding.version === EMBEDDING_CONFIG.version &&
      product.embedding.textHash === textHash;

    if (isCurrent) {
      return false; // Reused existing
    }

    // Need to generate new embedding
    await this.generateProductEmbedding(product);
    
    if (forceSave && typeof product.save === 'function') {
      await product.save();
    }
    
    return true; // Generated new
  }

  /**
   * Forces regeneration of the embedding regardless of current state.
   * @param {Object} product 
   */
  async refreshProductEmbedding(product, forceSave = false) {
    await this.generateProductEmbedding(product);
    if (forceSave && typeof product.save === 'function') {
      await product.save();
    }
    return true;
  }
}

module.exports = new ProductEmbeddingService();
