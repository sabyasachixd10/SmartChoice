/**
 * Ingredient and Additive Analysis Service
 * 
 * Provides deterministic normalization and structured factual analysis
 * of product ingredients, additives, and allergens.
 */

const normalizeIngredientText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Preserve original but trim edges
  let trimmed = text.trim();
  
  // Normalize repeated whitespace
  trimmed = trimmed.replace(/\s+/g, ' ');
  
  return trimmed;
};

const createComparisonForm = (normalizedText) => {
  if (!normalizedText) return '';
  return normalizedText
    .toLowerCase()
    .replace(/[.,:;()\[\]{}"'\\\/]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
};

const analyzeIngredients = (product) => {
  const ingData = product.ingredients || {};
  const rawIngredients = ingData.ingredients || [];
  
  const available = rawIngredients.length > 0;
  
  const ingredients = rawIngredients.map((ing, index) => {
    const normalized = normalizeIngredientText(ing);
    return {
      originalName: ing,
      normalizedName: normalized,
      comparisonForm: createComparisonForm(normalized),
      position: index + 1
    };
  });

  return {
    available,
    ingredientCount: ingredients.length,
    ingredients,
    leadingIngredients: ingredients.slice(0, 3)
  };
};

const parseAdditiveCode = (additiveStr) => {
  // e.g., 'en:e322' -> 'E322', 'e412' -> 'E412'
  if (!additiveStr) return { code: 'UNKNOWN', name: 'Unknown Additive' };
  
  const cleanStr = additiveStr.trim();
  const match = cleanStr.match(/(?:en:)?(e\d+[a-z]*)/i);
  
  if (match && match[1]) {
    const code = match[1].toUpperCase();
    return { code, name: code };
  }
  
  return { code: 'UNKNOWN', name: cleanStr };
};

const analyzeAdditives = (product) => {
  const ingData = product.ingredients || {};
  const rawAdditives = ingData.additives || [];
  
  const available = rawAdditives.length > 0;
  
  const additives = rawAdditives.map(add => {
    const parsed = parseAdditiveCode(add);
    return {
      name: parsed.name,
      code: parsed.code,
      category: 'unknown', // Do not invent categories
      confidence: 'high',
      source: 'OpenFoodFacts'
    };
  });

  return {
    available,
    additiveCount: additives.length,
    additives
  };
};

const analyzeAllergens = (product) => {
  const ingData = product.ingredients || {};
  const rawAllergens = ingData.allergens || [];
  
  const available = rawAllergens.length > 0;
  
  return {
    available, // Missing allergen info does not mean no allergens
    allergenCount: rawAllergens.length,
    allergens: rawAllergens.map(a => a.trim())
  };
};

const generateFindings = (ingAnalysis, addAnalysis, allAnalysis) => {
  const findings = [];
  
  if (ingAnalysis.available) {
    findings.push('Ingredient data is available.');
    findings.push(`Product contains ${ingAnalysis.ingredientCount} ingredient${ingAnalysis.ingredientCount !== 1 ? 's' : ''}.`);
    if (ingAnalysis.leadingIngredients.length > 0) {
      const leading = ingAnalysis.leadingIngredients.map(i => i.normalizedName).join(', ');
      findings.push(`Leading ingredients are: ${leading}.`);
    }
  } else {
    findings.push('Ingredient data is unavailable.');
  }

  if (addAnalysis.available) {
    findings.push(`Product contains ${addAnalysis.additiveCount} detected additive${addAnalysis.additiveCount !== 1 ? 's' : ''}.`);
  } else {
    // If ingredients are available but no additives, we can say no additives were detected
    if (ingAnalysis.available) {
      findings.push('No additives detected.');
    } else {
      findings.push('Additive information is unavailable.');
    }
  }

  if (allAnalysis.available) {
    findings.push(`Product contains ${allAnalysis.allergenCount} detected allergen${allAnalysis.allergenCount !== 1 ? 's' : ''}.`);
  } else {
    findings.push('Allergen information is unavailable.');
  }

  return findings;
};

const analyzeProduct = (product) => {
  if (!product) {
    throw new Error('Product object is required for analysis');
  }

  const ingredientAnalysis = analyzeIngredients(product);
  const additiveAnalysis = analyzeAdditives(product);
  const allergenAnalysis = analyzeAllergens(product);
  const findings = generateFindings(ingredientAnalysis, additiveAnalysis, allergenAnalysis);

  const limitations = [];
  if (!ingredientAnalysis.available) limitations.push("Missing ingredient data");
  if (!additiveAnalysis.available && !ingredientAnalysis.available) limitations.push("Missing additive data");
  if (!allergenAnalysis.available) limitations.push("Missing allergen data - may contain undeclared allergens");

  return {
    productId: product._id || product.identity?.barcode,
    ingredientAnalysis,
    additiveAnalysis,
    allergenAnalysis,
    findings,
    confidence: ingredientAnalysis.available ? 'high' : 'low',
    limitations
  };
};

module.exports = {
  analyzeProduct,
  normalizeIngredientText,
  createComparisonForm,
  parseAdditiveCode
};
