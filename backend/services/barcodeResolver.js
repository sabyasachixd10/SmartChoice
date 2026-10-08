const Product = require('../models/Product');
const offService = require('./openFoodFactsService');
const { validateMacroCalories } = require('./dataQualityService');

/**
 * Tool: Barcode Resolver
 * Deterministically resolves a barcode from local DB first, then OFF.
 */
const resolveBarcode = async (input, context) => {
  const { barcode } = input;
  if (!barcode || typeof barcode !== 'string') {
    throw new Error('Valid barcode string is required.');
  }

  // 1. Search local MongoDB
  let product = await Product.findOne({ 'identity.barcode': barcode });
  if (product) {
    return {
      product,
      source: 'internal_database',
      validationStatus: validateMacroCalories(product.nutrition),
      warnings: []
    };
  }

  // 2. Fetch from Open Food Facts
  let offProduct;
  try {
    offProduct = await offService.getProductByBarcode(barcode);
  } catch (error) {
    return {
      product: null,
      source: 'error',
      validationStatus: null,
      warnings: [`Failed to query Open Food Facts: ${error.message}`]
    };
  }

  if (!offProduct) {
    return {
      product: null,
      source: 'not_found',
      validationStatus: null,
      warnings: ['Product not found in internal database or Open Food Facts']
    };
  }

  // 3. Normalize and Validate
  const validation = validateMacroCalories(offProduct.nutrition);
  
  // 4. Save to local DB as caching
  let savedProduct;
  try {
    savedProduct = await Product.create(offProduct);
  } catch (err) {
    // If saving fails (e.g., race condition duplicate), we can just return the object in memory
    savedProduct = offProduct;
  }

  return {
    product: savedProduct,
    source: 'open_food_facts',
    validationStatus: validation,
    warnings: validation.status === 'invalid/review_required' ? [validation.reason] : []
  };
};

module.exports = {
  name: 'barcode_resolver',
  description: 'Resolves a product barcode by searching the internal database first, falling back to Open Food Facts, validating nutrition, and returning structured product data.',
  inputSchema: {
    barcode: { type: 'string', required: true }
  },
  execute: resolveBarcode
};
