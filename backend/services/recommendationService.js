const scoringConfig = require('../config/scoringConfig');
const scoringService = require('./scoringService');
const preferenceService = require('./preferenceService');

const MATCH = "MATCH";
const NO_MATCH = "NO_MATCH";
const UNKNOWN = "UNKNOWN";

// Simple helper to match string subsets
const matchString = (target, query) => {
  if (!target) return false;
  return target.toLowerCase().includes(query.toLowerCase());
};

const evaluatePreferences = (product, prefs) => {
  const results = [];
  let matchCount = 0;
  let noMatchCount = 0;
  let unknownCount = 0;
  let isEligible = true;

  const tn = product.nutrition || {};
  const ing = product.ingredients || {};
  const ident = product.identity || {};
  
  // High Protein
  if (prefs.highProtein) {
    if (tn.protein != null) {
      if (tn.protein >= scoringConfig.general.protein.moderate) {
        results.push({ preference: 'highProtein', status: MATCH, reason: 'Protein meets or exceeds moderate/high threshold.' });
        matchCount++;
      } else {
        results.push({ preference: 'highProtein', status: NO_MATCH, reason: 'Protein is below configured threshold.' });
        noMatchCount++;
      }
    } else {
      results.push({ preference: 'highProtein', status: UNKNOWN, reason: 'Protein data is unavailable.' });
      unknownCount++;
    }
  }

  // Low Sugar
  if (prefs.lowSugar) {
    if (tn.sugar != null) {
      if (tn.sugar <= scoringConfig.general.sugar.low) {
        results.push({ preference: 'lowSugar', status: MATCH, reason: 'Sugar is below the low-sugar threshold.' });
        matchCount++;
      } else {
        results.push({ preference: 'lowSugar', status: NO_MATCH, reason: 'Sugar exceeds the low-sugar threshold.' });
        noMatchCount++;
      }
    } else {
      results.push({ preference: 'lowSugar', status: UNKNOWN, reason: 'Sugar data is unavailable.' });
      unknownCount++;
    }
  }

  // High Fiber
  if (prefs.highFiber) {
    if (tn.fiber != null) {
      if (tn.fiber >= scoringConfig.general.fiber.moderate) {
        results.push({ preference: 'highFiber', status: MATCH, reason: 'Fiber meets or exceeds threshold.' });
        matchCount++;
      } else {
        results.push({ preference: 'highFiber', status: NO_MATCH, reason: 'Fiber is below threshold.' });
        noMatchCount++;
      }
    } else {
      results.push({ preference: 'highFiber', status: UNKNOWN, reason: 'Fiber data is unavailable.' });
      unknownCount++;
    }
  }

  // Avoid Allergens (Hard Constraint)
  if (prefs.avoidAllergens && prefs.avoidAllergens.length > 0) {
    const productAllergens = (ing.allergens || []).map(a => a.toLowerCase());
    let foundAllergen = false;
    let missingInfo = (!ing.allergens || ing.allergens.length === 0);

    for (const avoided of prefs.avoidAllergens) {
      if (productAllergens.some(a => a.includes(avoided))) {
        foundAllergen = true;
        results.push({ preference: 'avoidAllergens', status: NO_MATCH, reason: `Contains avoided allergen: ${avoided}` });
        isEligible = false; // Hard constraint failure
      }
    }
    
    if (!foundAllergen) {
      if (missingInfo) {
        results.push({ preference: 'avoidAllergens', status: UNKNOWN, reason: 'Allergen data is unavailable.' });
        unknownCount++;
      } else {
        results.push({ preference: 'avoidAllergens', status: MATCH, reason: 'No avoided allergens detected.' });
        matchCount++;
      }
    }
  }

  // Avoid Ingredients (Hard Constraint)
  if (prefs.avoidIngredients && prefs.avoidIngredients.length > 0) {
    const productIngredients = (ing.ingredients || []).map(i => i.toLowerCase());
    let foundIngredient = false;
    let missingInfo = (!ing.ingredients || ing.ingredients.length === 0);

    for (const avoided of prefs.avoidIngredients) {
      if (productIngredients.some(i => i.includes(avoided))) {
        foundIngredient = true;
        results.push({ preference: 'avoidIngredients', status: NO_MATCH, reason: `Contains avoided ingredient: ${avoided}` });
        isEligible = false; // Hard constraint failure
      }
    }
    
    if (!foundIngredient) {
      if (missingInfo) {
        results.push({ preference: 'avoidIngredients', status: UNKNOWN, reason: 'Ingredient list is unavailable.' });
        unknownCount++;
      } else {
        results.push({ preference: 'avoidIngredients', status: MATCH, reason: 'No avoided ingredients detected.' });
        matchCount++;
      }
    }
  }

  // Preferred Brands
  if (prefs.preferredBrands && prefs.preferredBrands.length > 0) {
    const brand = ident.brand || '';
    if (!brand) {
      results.push({ preference: 'preferredBrands', status: UNKNOWN, reason: 'Brand information is unavailable.' });
      unknownCount++;
    } else {
      const match = prefs.preferredBrands.some(b => matchString(brand, b));
      if (match) {
        results.push({ preference: 'preferredBrands', status: MATCH, reason: `Matches preferred brand: ${brand}` });
        matchCount++;
      } else {
        results.push({ preference: 'preferredBrands', status: NO_MATCH, reason: `Brand is not preferred.` });
        noMatchCount++;
      }
    }
  }

  // Vegan / Vegetarian
  if (prefs.vegan) {
    const labels = (product.processing?.labels || []).map(l => l.toLowerCase());
    if (labels.some(l => l.includes('vegan'))) {
      results.push({ preference: 'vegan', status: MATCH, reason: 'Product is labeled vegan.' });
      matchCount++;
    } else {
      results.push({ preference: 'vegan', status: UNKNOWN, reason: 'Vegan status cannot be deterministically verified.' });
      unknownCount++;
    }
  }

  return {
    results,
    matchCount,
    noMatchCount,
    unknownCount,
    isEligible
  };
};

const calculatePersonalizedScore = (evalResults) => {
  const totalEvaluated = evalResults.matchCount + evalResults.noMatchCount + evalResults.unknownCount;
  if (totalEvaluated === 0) return 50; // Neutral default if no preferences are selected

  // Simple scoring: Match = 100, Unknown = 50, NoMatch = 0
  const score = ((evalResults.matchCount * 100) + (evalResults.unknownCount * 50) + (evalResults.noMatchCount * 0)) / totalEvaluated;
  return Math.round(score);
};

const rankProducts = async (products, rawPrefs = {}) => {
  const prefs = preferenceService.normalizePreferences(rawPrefs);
  
  const recommendations = [];

  for (const product of products) {
    // 1. Get base SmartChoice Score
    const scData = scoringService.calculateSmartChoiceScore(product, prefs);
    const smartChoiceScore = scData.totalScore;

    // 2. Evaluate Preferences
    const evalResults = evaluatePreferences(product, prefs);
    const prefScore = calculatePersonalizedScore(evalResults);
    
    // 3. Confidence Adjustment
    // Unknowns in preferences reduce personalization confidence
    const totalEvals = evalResults.matchCount + evalResults.noMatchCount + evalResults.unknownCount;
    const prefConfidencePenalty = totalEvals > 0 ? (evalResults.unknownCount / totalEvals) * 20 : 0;
    
    const confidenceScore = Math.max(0, Math.round(scData.confidence.score - prefConfidencePenalty));

    // 4. Final Ranking Score
    let finalScore = 0;
    if (evalResults.isEligible) {
       finalScore = Math.round(
        (smartChoiceScore * scoringConfig.RECOMMENDATION_CONFIG.smartChoiceWeight) +
        (prefScore * scoringConfig.RECOMMENDATION_CONFIG.preferenceWeight)
      );
    }

    recommendations.push({
      productId: product._id,
      productName: product.identity?.name || 'Unknown',
      isEligible: evalResults.isEligible,
      smartChoiceScore: smartChoiceScore,
      personalization: {
        score: prefScore,
        preferenceResults: evalResults.results
      },
      finalScore: evalResults.isEligible ? finalScore : 0,
      confidence: {
        score: confidenceScore,
        level: confidenceScore >= 80 ? 'high' : confidenceScore >= 50 ? 'medium' : 'low'
      },
      positiveFactors: scData.positiveFactors,
      negativeFactors: scData.negativeFactors,
      limitations: scData.limitations
    });
  }

  // Deterministic Sorting
  recommendations.sort((a, b) => {
    // 1. Ineligible at the bottom
    if (a.isEligible !== b.isEligible) return a.isEligible ? -1 : 1;
    // 2. Final Score descending
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    // 3. SmartChoice Score descending
    if (b.smartChoiceScore !== a.smartChoiceScore) return b.smartChoiceScore - a.smartChoiceScore;
    // 4. Lexicographical by name ascending
    return a.productName.localeCompare(b.productName);
  });

  return recommendations;
};

module.exports = {
  evaluatePreferences,
  rankProducts
};
