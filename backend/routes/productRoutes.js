const express = require('express');
const router = express.Router();
const {
  searchProducts,
  getProductByBarcode,
  getProductById,
  getSimilarProducts,
  compareProducts,
  getScore,
  getIngredients,
  getProcessing
} = require('../controllers/productController');

router.get('/search', searchProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id/similar', getSimilarProducts);
router.get('/:id/score', getScore);
router.get('/:id/ingredients', getIngredients);
router.get('/:id/processing', getProcessing);
router.get('/:id', getProductById);

module.exports = router;
