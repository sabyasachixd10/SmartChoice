module.exports = {
  RECOMMENDATION_CONFIG: {
    smartChoiceWeight: 0.70,
    preferenceWeight: 0.30
  },
  // Global Component Weights
  weights: {
    nutrition: 0.40,
    ingredients: 0.20,
    processing: 0.15,
    proteinFiber: 0.15,
    preferences: 0.10
  },

  // Baseline nutritional thresholds (per 100g/ml)
  // Values above 'high' trigger a penalty, values below 'low' trigger a reward (or vice-versa depending on the nutrient)
  general: {
    sugar: { low: 5, moderate: 15, high: 22.5 },
    saturatedFat: { low: 1.5, moderate: 5, high: 10 },
    sodium: { low: 120, moderate: 400, high: 600 },
    calories: { low: 40, moderate: 150, high: 250 }, // For context, though harder to generalize
    protein: { moderate: 5, high: 10 },
    fiber: { moderate: 3, high: 6 }
  },

  // Category-specific architecture fallback (ready for future expansion)
  categories: {
    beverages: {
      sugar: { low: 2.5, moderate: 5, high: 10 },
      calories: { low: 20, moderate: 50, high: 100 }
    }
  },

  // Processing configuration (NOVA scale)
  processing: {
    nova1: 100, // Unprocessed / minimally processed
    nova2: 80,  // Processed culinary ingredients
    nova3: 60,  // Processed foods
    nova4: 30,  // Ultra-processed
    unknown: 50 // Neutral default for unknown
  }
};
