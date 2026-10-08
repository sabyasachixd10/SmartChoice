/**
 * OCR Parser Service
 * Deterministically extracts ingredients and nutrition data from raw OCR text.
 * This parser operates purely on heuristics and does not guarantee verification.
 */

// Common headers indicating ingredient section starts
const INGREDIENT_HEADERS = [
  'ingredients:', 'ingredients', 'ingredient', 'ingredients list', 'ingrédients'
];

// Common headers indicating the end of ingredients (and often start of nutrition)
const STOP_HEADERS = [
  'nutrition facts', 'nutrition information', 'nutritional information',
  'allergens', 'contains', 'storage', 'directions', 'manufacturer',
  'net weight', 'serving size', 'valeurs nutritionnelles'
];

export const parseOcrText = (rawText) => {
  if (!rawText || rawText.trim().length === 0) {
    return {
      available: false,
      rawText: '',
      warnings: ['No text detected in OCR output.'],
      ingredients: { available: false, rawText: '', text: '', confidence: 'unknown' },
      nutrition: { available: false, basis: 'unknown', values: {}, confidence: 'unknown' }
    };
  }

  const warnings = [];
  const normalizedText = rawText.toLowerCase();

  // 1. Ingredients Parsing
  const ingredients = parseIngredients(rawText, normalizedText, warnings);

  // 2. Nutrition Parsing
  const nutrition = parseNutrition(rawText, normalizedText, warnings);

  if (!ingredients.available) {
    warnings.push('Ingredient section not found.');
  }

  if (!nutrition.available) {
    warnings.push('Nutrition section not found.');
  }

  return {
    available: true,
    rawText,
    warnings,
    ingredients,
    nutrition
  };
};

const parseIngredients = (rawText, normalizedText, warnings) => {
  const lines = rawText.split('\n');
  const lowerLines = normalizedText.split('\n');

  let startIndex = -1;
  let endIndex = lines.length;

  // Find start
  for (let i = 0; i < lowerLines.length; i++) {
    const line = lowerLines[i].trim();
    if (INGREDIENT_HEADERS.some(h => line.includes(h) || line.startsWith(h))) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    return { available: false, rawText: '', text: '', confidence: 'unknown' };
  }

  // Find end (if it hits a stop header)
  for (let i = startIndex + 1; i < lowerLines.length; i++) {
    const line = lowerLines[i].trim();
    // Allow empty lines, but if it hits a strong stop header, break
    if (STOP_HEADERS.some(h => line.includes(h))) {
      endIndex = i;
      break;
    }
  }

  // Extract raw text segment
  const rawIngLines = lines.slice(startIndex, endIndex).join(' ').trim();
  
  // Clean up: remove the actual "Ingredients:" prefix if it exists at the very beginning
  let cleanedText = rawIngLines;
  const prefixMatch = cleanedText.match(/^(ingredients?\s*:?|ingrédients?\s*:?)\s*/i);
  if (prefixMatch) {
    cleanedText = cleanedText.substring(prefixMatch[0].length);
  }

  if (cleanedText.length < 5) {
    warnings.push('Ingredient section detected but contained insufficient text.');
    return { available: false, rawText: rawIngLines, text: '', confidence: 'low' };
  }

  // NOTE: We do not aggressively split by comma into an array because OCR often misses commas or adds false ones.
  // We provide the cleaned block of text. Downstream NLP can parse the exact array if needed.

  return {
    available: true,
    rawText: rawIngLines,
    text: cleanedText,
    ingredients: [], // Empty array since we aren't claiming every comma is an ingredient
    confidence: 'medium'
  };
};

const parseNutrition = (rawText, normalizedText, warnings) => {
  // Regex to fix common OCR number errors like 'O' to '0', 'l' to '1' only when attached to units
  // For now, we will be conservative and only fix if it looks like a number.
  const fields = {
    energyKcal: { labels: ['energy', 'calories', 'energie'], expectedUnit: ['kcal'] },
    fat: { labels: ['total fat', 'fat', 'matières grasses', 'lipides'], expectedUnit: ['g'] },
    saturatedFat: { labels: ['saturated fat', 'saturated', 'dont acides gras saturés', 'saturates'], expectedUnit: ['g'] },
    carbohydrates: { labels: ['total carbohydrate', 'carbohydrate', 'carbohydrates', 'glucides', 'carbs'], expectedUnit: ['g'] },
    sugars: { labels: ['sugars', 'sugar', 'dont sucres'], expectedUnit: ['g'] },
    fiber: { labels: ['dietary fiber', 'fiber', 'fibre', 'fibres alimentaires'], expectedUnit: ['g'] },
    protein: { labels: ['protein', 'protéines'], expectedUnit: ['g'] },
    sodium: { labels: ['sodium', 'salt', 'sel'], expectedUnit: ['mg', 'g'] } // Salt is usually g, sodium mg
  };

  const values = {};
  let foundAny = false;

  // Determine basis
  let basis = 'unknown';
  if (normalizedText.includes('per 100g') || normalizedText.includes('pour 100g') || normalizedText.includes('100 g')) {
    basis = 'per 100g';
  } else if (normalizedText.includes('per 100ml') || normalizedText.includes('pour 100ml') || normalizedText.includes('100 ml')) {
    basis = 'per 100ml';
  } else if (normalizedText.includes('per serving') || normalizedText.includes('serving size')) {
    basis = 'per serving';
  } else if (normalizedText.includes('per portion')) {
    basis = 'per portion';
  }

  if (basis === 'unknown') {
    warnings.push('Nutrition basis unknown (e.g., per 100g vs per serving).');
  }

  const lines = normalizedText.split('\n');

  Object.keys(fields).forEach(key => {
    const config = fields[key];
    for (let line of lines) {
      // If line contains one of the labels
      if (config.labels.some(l => line.includes(l))) {
        // Try to extract a number and a unit
        // Matches: 12g, 12 g, 1.2g, <1g, 0,5g (comma decimal)
        // We also try to handle OCR O/o as 0 in numbers.
        
        // Let's normalize common OCR errors in this specific line ONLY for parsing numbers
        let cleanLine = line.replace(/([0-9])o/gi, '$10').replace(/o([0-9])/gi, '0$1');
        cleanLine = cleanLine.replace(/([0-9])l/gi, '$11').replace(/l([0-9])/gi, '1$1');
        cleanLine = cleanLine.replace(/([0-9])s/gi, '$15').replace(/s([0-9])/gi, '5$1');

        // Regex for number and optional unit
        const numMatch = cleanLine.match(/<?([0-9]+[.,]?[0-9]*)\s*(kcal|kj|g|mg|mcg)?/i);
        if (numMatch && numMatch[1]) {
          let val = numMatch[1].replace(',', '.'); // normalize decimal
          let unit = numMatch[2] ? numMatch[2].toLowerCase() : null;

          // Validate unit if extracted
          if (unit && !config.expectedUnit.includes(unit)) {
            warnings.push(`Ambiguous unit '${unit}' for field ${key}.`);
          }

          let confidence = 'medium';
          if (!unit) {
            warnings.push(`Unit unavailable for ${key}.`);
            confidence = 'low';
          }

          values[key] = {
            value: parseFloat(val),
            unit: unit,
            confidence: confidence
          };
          foundAny = true;
          break; // Stop looking for this field once found
        }
      }
    }
  });

  if (!foundAny) {
    return { available: false, basis, values: {}, confidence: 'unknown' };
  }

  if (Object.keys(values).length < 3) {
    warnings.push('Incomplete nutrition fields extracted.');
  }

  return {
    available: true,
    basis,
    values,
    confidence: 'medium'
  };
};
