const Product = require('../models/Product');
const offService = require('../services/openFoodFactsService');
const similarityService = require('../services/similarityService');
const comparisonService = require('../services/comparisonService');
const scoringService = require('../services/scoringService');
const preferenceService = require('../services/preferenceService');
const recommendationService = require('../services/recommendationService');

// @desc    Search products
// @route   GET /api/products/search?q=...
// @access  Public
const searchProducts = async (req, res, next) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length === 0) {
      res.status(400);
      throw new Error('Search query is required');
    }

    const searchTerm = query.trim();

    // 1. Check MongoDB first
    const localProducts = await Product.find({
      $or: [
        { 'identity.name': { $regex: searchTerm, $options: 'i' } },
        { 'identity.brand': { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(10);

    if (localProducts.length >= 5) {
      return res.json({
        success: true,
        data: localProducts,
        message: 'Products retrieved from local database'
      });
    }

    // 2. Query OFF if not enough local results
    let offProducts = [];
    let externalError = null;
    try {
      offProducts = await offService.searchProducts(searchTerm, 10);
    } catch (err) {
      console.warn("External search failed:", err.message);
      externalError = "External product search is temporarily unavailable. Displaying local results only.";
    }
    
    if (offProducts.length === 0) {
      return res.json({
        success: true,
        data: localProducts,
        message: externalError || 'No additional products found'
      });
    }

    // 3. Save valid products to MongoDB
    const savedProducts = [];
    for (const prod of offProducts) {
      try {
        const existing = await Product.findOne({ 'identity.barcode': prod.identity.barcode });
        if (existing) {
          savedProducts.push(existing);
        } else {
          const newProduct = await Product.create(prod);
          savedProducts.push(newProduct);
        }
      } catch (err) {
        console.error(`Failed to save product ${prod.identity.barcode}:`, err.message);
      }
    }

    // 4. Combine and return unique results
    const allProductsMap = new Map();
    [...localProducts, ...savedProducts].forEach(p => {
      allProductsMap.set(p.identity.barcode, p);
    });

    res.json({
      success: true,
      data: Array.from(allProductsMap.values()),
      message: 'Products retrieved successfully'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get product by Barcode
// @route   GET /api/products/barcode/:barcode
// @access  Public
const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    
    // Validate barcode format roughly
    if (!barcode || !/^\d+$/.test(barcode)) {
      res.status(400);
      throw new Error('Invalid barcode format');
    }

    // 1. MongoDB lookup
    let product = await Product.findOne({ 'identity.barcode': barcode });

    if (product) {
      return res.json({
        success: true,
        data: product,
        message: 'Product retrieved from local database'
      });
    }

    // 2. Not found locally, query OFF
    const offProduct = await offService.getProductByBarcode(barcode);

    if (!offProduct) {
      res.status(404);
      throw new Error('Product not found');
    }

    // 3. Save to MongoDB
    product = await Product.create(offProduct);

    res.json({
      success: true,
      data: product,
      message: 'Product retrieved and cached'
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get product by MongoDB ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400);
      throw new Error('Invalid product ID');
    }

    const product = await Product.findById(id);

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    res.json({
      success: true,
      data: product,
      message: 'Product retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get similar products
// @route   GET /api/products/:id/similar
// @access  Public
const getSimilarProducts = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400);
      throw new Error('Invalid product ID');
    }

    const data = await similarityService.getSimilarProducts(id, 5);
    
    res.json({
      success: true,
      data,
      message: 'Similar products retrieved successfully'
    });
  } catch (error) {
    if (error.message === 'Target product not found') {
      res.status(404);
    }
    next(error);
  }
};

// @desc    Compare multiple products
// @route   POST /api/compare
// @access  Public
const compareProducts = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      res.status(400);
      throw new Error('productIds must be an array');
    }

    // Validate ObjectIds
    for (const id of productIds) {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400);
        throw new Error(`Invalid product ID: ${id}`);
      }
    }

    const data = await comparisonService.compareProducts(productIds);

    res.json({
      success: true,
      data,
      message: 'Products compared successfully'
    });
  } catch (error) {
    if (error.message.includes('between 2 and 5') || error.message.includes('Duplicate') || error.message.includes('enough products')) {
      res.status(400);
    }
    next(error);
  }
};

// @desc    Get product score
// @route   GET /api/products/:id/score
// @access  Public
const getScore = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400);
      throw new Error('Invalid product ID');
    }

    // Extract preferences from query
    const prefs = {
      highProtein: req.query.highProtein === 'true',
      lowSugar: req.query.lowSugar === 'true',
      lowSodium: req.query.lowSodium === 'true',
      highFiber: req.query.highFiber === 'true'
    };

    const data = await scoringService.getScoreForProduct(id, prefs);
    
    // As per requirement: "Return: { success: true, data: { product: {}, score: 76, breakdown: {}, confidence: {}, ... } }"
    res.json({
      success: true,
      data
    });
  } catch (error) {
    if (error.message === 'Product not found') {
      res.status(404);
    }
    next(error);
  }
};

// @desc    Get multiple product scores
// @route   POST /api/scores
// @access  Public
const getScores = async (req, res, next) => {
  try {
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds)) {
      res.status(400);
      throw new Error('productIds must be an array');
    }

    const data = await scoringService.getScoresForProducts(productIds);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get default preferences
// @route   GET /api/preferences/default
// @access  Public
const getDefaultPreferences = (req, res) => {
  res.json({
    success: true,
    data: preferenceService.getDefaultPreferences()
  });
};

// @desc    Get recommendations
// @route   POST /api/recommendations
// @access  Public
const getRecommendations = async (req, res, next) => {
  try {
    const { productIds, preferences } = req.body;
    
    if (!Array.isArray(productIds)) {
      res.status(400);
      throw new Error('productIds must be an array');
    }

    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length === 0) {
       return res.json({ success: true, data: [] });
    }

    const ranked = await recommendationService.rankProducts(products, preferences);

    res.json({
      success: true,
      data: ranked
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Semantic product search
// @route   GET /api/search/semantic?q=...
// @access  Public
const semanticSearch = async (req, res, next) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length === 0) {
      res.status(400);
      throw new Error('Search query is required');
    }

    if (query.length > 200) {
      res.status(400);
      throw new Error('Search query is too long (max 200 chars)');
    }

    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    
    const vectorSearchService = require('../services/vectorSearchService');
    const results = await vectorSearchService.semanticProductSearch(query, { limit });

    res.json({
      success: true,
      query: query,
      data: results,
      message: 'Semantic search completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product ingredients analysis
// @route   GET /api/products/:id/ingredients
// @access  Public
const getIngredients = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ingredientAnalysisService = require('../services/ingredientAnalysisService');

    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const analysis = ingredientAnalysisService.analyzeProduct(product);

    res.json({
      success: true,
      data: analysis,
      message: 'Ingredient analysis completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product processing analysis
// @route   GET /api/products/:id/processing
// @access  Public
const getProcessing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const processingAnalysisService = require('../services/processingAnalysisService');

    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const analysis = processingAnalysisService.analyzeProcessing(product);

    res.json({
      success: true,
      data: analysis,
      message: 'Processing analysis completed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchProducts,
  getProductByBarcode,
  getProductById,
  getSimilarProducts,
  compareProducts,
  getScore,
  getScores,
  getDefaultPreferences,
  getRecommendations,
  semanticSearch,
  getIngredients,
  getProcessing
};
