const config = require('../config/scoringConfig');
const Product = require('../models/Product');

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// 1. Calculate Confidence
const calculateScoreConfidence = (product) => {
  const missingFields = [];
  let confidence = 100;

  const tn = product.nutrition || {};
  if (tn.calories == null) { confidence -= 10; missingFields.push('calories'); }
  if (tn.sugar == null) { confidence -= 15; missingFields.push('sugar'); }
  if (tn.saturatedFat == null) { confidence -= 10; missingFields.push('saturatedFat'); }
  if (tn.sodium == null) { confidence -= 15; missingFields.push('sodium'); }
  if (tn.protein == null) { confidence -= 10; missingFields.push('protein'); }
  if (tn.fiber == null) { confidence -= 10; missingFields.push('fiber'); }

  if (!product.ingredients?.ingredients || product.ingredients.ingredients.length === 0) {
    confidence -= 10;
    missingFields.push('ingredients');
  }

  if (!product.processing?.novaGroup) {
    confidence -= 10;
    missingFields.push('novaGroup');
  }

  let level = 'high';
  if (confidence < 50) level = 'low';
  else if (confidence < 80) level = 'medium';

  return {
    confidence: clamp(confidence, 0, 100),
    level,
    missingFields
  };
};

// 2. Nutrition Score (Sugar, Sat Fat, Sodium, Calories)
const calculateNutritionScore = (product, category) => {
  const tn = product.nutrition || {};
  const catConfig = config.categories[category] || {};
  const thresholds = { ...config.general, ...catConfig };
  let score = 100;
  const factors = [];
  const limitations = [];

  if (tn.sugar != null) {
    if (tn.sugar > thresholds.sugar.high) { score -= 30; factors.push("High sugar content"); }
    else if (tn.sugar > thresholds.sugar.moderate) { score -= 15; factors.push("Moderate sugar content"); }
    else { factors.push("Low sugar content"); }
  } else limitations.push("Missing sugar data");

  if (tn.saturatedFat != null) {
    if (tn.saturatedFat > thresholds.saturatedFat.high) { score -= 25; factors.push("High saturated fat"); }
    else if (tn.saturatedFat > thresholds.saturatedFat.moderate) { score -= 10; factors.push("Moderate saturated fat"); }
    else { factors.push("Low saturated fat"); }
  } else limitations.push("Missing saturated fat data");

  if (tn.sodium != null) {
    if (tn.sodium > thresholds.sodium.high) { score -= 25; factors.push("High sodium content"); }
    else if (tn.sodium > thresholds.sodium.moderate) { score -= 10; factors.push("Moderate sodium content"); }
    else { factors.push("Low sodium content"); }
  } else limitations.push("Missing sodium data");

  // Calories check just as minor adjustment
  if (tn.calories != null) {
    if (tn.calories > thresholds.calories.high) { score -= 10; factors.push("High calorie density"); }
  }

  return { score: clamp(score, 0, 100), factors, limitations };
};

// 3. Ingredient Score
const calculateIngredientScore = (product) => {
  let score = 100;
  const factors = [];
  const limitations = [];
  const ing = product.ingredients || {};

  if (!ing.ingredients || ing.ingredients.length === 0) {
    return { score: 50, factors: [], limitations: ["Ingredient list unavailable"] };
  }

  const additives = ing.additives || [];
  if (additives.length === 0) {
    factors.push("No listed additives");
  } else if (additives.length <= 3) {
    score -= 10;
    factors.push("Contains a few additives");
  } else if (additives.length > 3) {
    score -= 25;
    factors.push("Contains multiple additives");
  }

  // A basic check for added sugar indicators
  const ingredientsString = ing.ingredients.join(' ').toLowerCase();
  if (ingredientsString.includes('sugar') || ingredientsString.includes('syrup') || ingredientsString.includes('sucrose')) {
    score -= 15;
    factors.push("Contains added sugars/syrups");
  }

  return { score: clamp(score, 0, 100), factors, limitations };
};

// 4. Processing Score
const calculateProcessingScore = (product) => {
  const proc = product.processing || {};
  let score = config.processing.unknown;
  const factors = [];
  const limitations = [];

  if (proc.novaGroup) {
    score = config.processing[`nova${proc.novaGroup}`] || config.processing.unknown;
    factors.push(`Classified as NOVA ${proc.novaGroup} (Source-provided classification)`);
  } else {
    limitations.push("Processing classification (NOVA) incomplete");
  }

  return { score: clamp(score, 0, 100), factors, limitations };
};

// 5. Protein + Fiber Score
const calculateProteinFiberScore = (product) => {
  let score = 50; // Neutral start
  const tn = product.nutrition || {};
  const factors = [];
  const limitations = [];

  if (tn.protein != null) {
    if (tn.protein > config.general.protein.high) { score += 25; factors.push("High protein content"); }
    else if (tn.protein > config.general.protein.moderate) { score += 10; factors.push("Good protein content"); }
  } else limitations.push("Missing protein data");

  if (tn.fiber != null) {
    if (tn.fiber > config.general.fiber.high) { score += 25; factors.push("High fiber content"); }
    else if (tn.fiber > config.general.fiber.moderate) { score += 15; factors.push("Good fiber content"); }
  } else limitations.push("Missing fiber data");

  return { score: clamp(score, 0, 100), factors, limitations };
};

// 6. Preference Score
const calculatePreferenceScore = (product, prefs = {}) => {
  let score = 70; // Good neutral base
  const tn = product.nutrition || {};
  const factors = [];
  const limitations = [];

  // Very naive example for preferences
  if (prefs.highProtein) {
    if (tn.protein != null && tn.protein > config.general.protein.high) {
      score += 30;
      factors.push("Matches preference: High Protein");
    } else {
      score -= 10;
      factors.push("Does not meet preference: High Protein");
    }
  }

  if (prefs.lowSugar) {
    if (tn.sugar != null && tn.sugar <= config.general.sugar.low) {
      score += 30;
      factors.push("Matches preference: Low Sugar");
    }
  }

  return { score: clamp(score, 0, 100), factors, limitations };
};

const getCategory = (product) => {
  // simple matching for category awareness demo
  const catString = (product.identity?.categories || []).join(' ').toLowerCase();
  if (catString.includes('beverage') || catString.includes('boisson')) return 'beverages';
  return 'general';
};

// Main function
const calculateSmartChoiceScore = (product, preferences = {}) => {
  const conf = calculateScoreConfidence(product);
  const category = getCategory(product);
  
  const nut = calculateNutritionScore(product, category);
  const ing = calculateIngredientScore(product);
  const proc = calculateProcessingScore(product);
  const pf = calculateProteinFiberScore(product);
  const pref = calculatePreferenceScore(product, preferences);

  const totalScore = Math.round(
    nut.score * config.weights.nutrition +
    ing.score * config.weights.ingredients +
    proc.score * config.weights.processing +
    pf.score * config.weights.proteinFiber +
    pref.score * config.weights.preferences
  );

  const positiveFactors = [];
  const negativeFactors = [];
  const allFactors = [...nut.factors, ...ing.factors, ...proc.factors, ...pf.factors, ...pref.factors];
  
  allFactors.forEach(f => {
    if (f.toLowerCase().includes('high sugar') || f.toLowerCase().includes('high sodium') || f.toLowerCase().includes('high saturated') || f.toLowerCase().includes('added sugar') || f.toLowerCase().includes('multiple additives') || f.toLowerCase().includes('does not meet')) {
      negativeFactors.push(f);
    } else if (f.toLowerCase().includes('low sugar') || f.toLowerCase().includes('low sodium') || f.toLowerCase().includes('low saturated') || f.toLowerCase().includes('good') || f.toLowerCase().includes('high protein') || f.toLowerCase().includes('high fiber') || f.toLowerCase().includes('matches')) {
      positiveFactors.push(f);
    }
  });

  const limitations = [...new Set([
    ...conf.missingFields.map(f => `Missing ${f} data`),
    ...nut.limitations, ...ing.limitations, ...proc.limitations, ...pf.limitations
  ])];

  return {
    totalScore,
    breakdown: {
      nutrition: Math.round(nut.score),
      ingredients: Math.round(ing.score),
      processing: Math.round(proc.score),
      proteinFiber: Math.round(pf.score),
      preferences: Math.round(pref.score)
    },
    confidence: {
      score: conf.confidence,
      level: conf.level
    },
    positiveFactors: [...new Set(positiveFactors)],
    negativeFactors: [...new Set(negativeFactors)],
    limitations
  };
};

const getScoreForProduct = async (productId, preferences = {}) => {
  const product = await Product.findById(productId);
  if (!product) throw new Error("Product not found");
  return {
    product,
    ...calculateSmartChoiceScore(product, preferences)
  };
};

const getScoresForProducts = async (productIds, preferences = {}) => {
  const products = await Product.find({ _id: { $in: productIds } });
  return products.map(product => ({
    product,
    ...calculateSmartChoiceScore(product, preferences)
  }));
};

module.exports = {
  calculateSmartChoiceScore,
  getScoreForProduct,
  getScoresForProducts
};
