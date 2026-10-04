const Product = require('../models/Product');

const SIMILARITY_WEIGHTS = {
  category: 40,
  productType: 20,
  servingSize: 15,
  ingredients: 15,
  nutrition: 10
};

// Basic Jaccard similarity for arrays of strings
const calculateJaccardSimilarity = (arr1, arr2) => {
  if (!arr1 || !arr2 || (arr1.length === 0 && arr2.length === 0)) return 0;
  const set1 = new Set(arr1.map(item => item.toLowerCase().trim()));
  const set2 = new Set(arr2.map(item => item.toLowerCase().trim()));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
};

// Compare numbers safely
const compareNumeric = (val1, val2, maxDiff) => {
  if (val1 === null || val2 === null || val1 === undefined || val2 === undefined) return 0;
  const diff = Math.abs(val1 - val2);
  if (diff >= maxDiff) return 0;
  return (maxDiff - diff) / maxDiff; // 0 to 1
};

const calculateSimilarity = (target, candidate) => {
  let score = 0;
  const reasons = [];

  // 1. Category Similarity (40%)
  const targetCats = target.identity?.categories || [];
  const candCats = candidate.identity?.categories || [];
  const catSim = calculateJaccardSimilarity(targetCats, candCats);
  score += catSim * SIMILARITY_WEIGHTS.category;
  if (catSim > 0.5) reasons.push("Same product category");
  else if (catSim > 0) reasons.push("Related category");

  // 2. Product Type Similarity (20%)
  const targetType = target.identity?.productType || '';
  const candType = candidate.identity?.productType || '';
  if (targetType && candType && targetType === candType) {
    score += SIMILARITY_WEIGHTS.productType;
    reasons.push("Same product type");
  }

  // 3. Serving Size Similarity (15%)
  const targetServing = parseFloat(target.serving?.servingSize) || 0;
  const candServing = parseFloat(candidate.serving?.servingSize) || 0;
  if (targetServing > 0 && candServing > 0) {
    const servingSim = compareNumeric(targetServing, candServing, targetServing * 0.5); // max 50% diff
    score += servingSim * SIMILARITY_WEIGHTS.servingSize;
    if (servingSim > 0.8) reasons.push("Similar serving size");
  }

  // 4. Ingredient Similarity (15%)
  const targetIng = target.ingredients?.ingredients || [];
  const candIng = candidate.ingredients?.ingredients || [];
  const ingSim = calculateJaccardSimilarity(targetIng, candIng);
  score += ingSim * SIMILARITY_WEIGHTS.ingredients;
  if (ingSim > 0.6) reasons.push("Highly similar ingredient profile");
  else if (ingSim > 0.3) reasons.push("Similar ingredient profile");

  // 5. Nutrition Similarity (10%)
  const tn = target.nutrition || {};
  const cn = candidate.nutrition || {};
  let numFields = 0;
  let numScore = 0;
  
  const nutFields = ['calories', 'protein', 'carbohydrates', 'sugar', 'fat', 'saturatedFat', 'fiber', 'sodium'];
  nutFields.forEach(field => {
    if (tn[field] !== null && cn[field] !== null && tn[field] !== undefined && cn[field] !== undefined) {
      numFields++;
      const maxDiff = tn[field] > 0 ? tn[field] * 0.5 : 5; // 50% or 5 units fallback
      numScore += compareNumeric(tn[field], cn[field], maxDiff);
    }
  });

  if (numFields > 0) {
    const nutSim = numScore / numFields;
    score += nutSim * SIMILARITY_WEIGHTS.nutrition;
    if (nutSim > 0.7) reasons.push("Similar nutritional profile");
  }

  return {
    similarityScore: Math.round(score),
    reasons: [...new Set(reasons)] // deduplicate
  };
};

const getSimilarProducts = async (productId, limit = 5) => {
  const targetProduct = await Product.findById(productId);
  if (!targetProduct) {
    throw new Error("Target product not found");
  }

  const categories = targetProduct.identity?.categories || [];
  
  // Find candidates: same categories, excluding the target itself
  const query = { _id: { $ne: targetProduct._id } };
  
  if (categories.length > 0) {
    query['identity.categories'] = { $in: categories };
  }

  const candidates = await Product.find(query).limit(50); // limit retrieval pool for performance

  const results = candidates.map(candidate => {
    const sim = calculateSimilarity(targetProduct, candidate);
    return {
      product: candidate,
      similarityScore: sim.similarityScore,
      reasons: sim.reasons
    };
  });

  // Sort descending and take top N
  results.sort((a, b) => b.similarityScore - a.similarityScore);
  
  // Filter out products with 0 similarity
  const filtered = results.filter(r => r.similarityScore > 10).slice(0, limit);

  return {
    targetProduct,
    similarProducts: filtered
  };
};

module.exports = {
  getSimilarProducts,
  calculateSimilarity,
  calculateJaccardSimilarity
};
