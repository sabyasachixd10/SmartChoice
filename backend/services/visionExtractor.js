const { validateMacroCalories } = require('./dataQualityService');
const { normalizeNutrition } = require('./nutritionNormalizationService');
const { GoogleGenAI, Type } = require('@google/genai');
const { executeWithRetry } = require('../utils/geminiErrorHandler');

let aiClient = null;
const initAi = () => {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

/**
 * Common headers indicating ingredient section starts
 */
const INGREDIENT_HEADERS = ['ingredients:', 'ingredients', 'ingredient', 'ingredients list', 'ingrédients'];

/**
 * Common headers indicating the end of ingredients (and often start of nutrition)
 */
const STOP_HEADERS = [
  'nutrition facts', 'nutrition information', 'nutritional information',
  'allergens', 'contains', 'storage', 'directions', 'manufacturer',
  'net weight', 'serving size', 'valeurs nutritionnelles'
];

/**
 * Core parsing logic adapted from frontend OCR parser to establish the backend tool interface.
 */
const parseIngredients = (rawText, normalizedText, warnings) => {
  const lines = rawText.split('\n');
  const lowerLines = normalizedText.split('\n');

  let startIndex = -1;
  let endIndex = lines.length;

  for (let i = 0; i < lowerLines.length; i++) {
    const line = lowerLines[i].trim();
    if (INGREDIENT_HEADERS.some(h => line.includes(h) || line.startsWith(h))) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) return { available: false, text: '', ingredients: [] };

  for (let i = startIndex + 1; i < lowerLines.length; i++) {
    const line = lowerLines[i].trim();
    if (STOP_HEADERS.some(h => line.includes(h))) {
      endIndex = i;
      break;
    }
  }

  let rawIngLines = lines.slice(startIndex, endIndex).join(' ').trim();
  const prefixMatch = rawIngLines.match(/^(ingredients?\s*:?|ingrédients?\s*:?)\s*/i);
  if (prefixMatch) {
    rawIngLines = rawIngLines.substring(prefixMatch[0].length);
  }

  if (rawIngLines.length < 5) {
    warnings.push('Ingredient section detected but contained insufficient text.');
    return { available: false, rawIngredients: '', ingredients: [] };
  }

  return { 
    available: true, 
    rawIngredients: rawIngLines, 
    ingredients: parseIngredientList(rawIngLines) 
  };
};

const parseIngredientList = (rawText) => {
  if (!rawText) return [];
  // Clean up common OCR artifacts but preserve nested structures
  let cleaned = rawText
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .trim();
  
  const arr = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '(') depth++;
    if (char === ')') depth--;

    if ((char === ',' || char === ';') && depth === 0) {
      if (current.trim()) arr.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) arr.push(current.trim());

  return arr.filter(i => i.length > 1);
};

const parseNutrition = (normalizedText, warnings) => {
  const fields = {
    calories: { labels: ['energy', 'calories', 'energie'], expectedUnit: ['kcal'] },
    fat: { labels: ['total fat', 'fat', 'matières grasses', 'lipides'], expectedUnit: ['g'] },
    saturatedFat: { labels: ['saturated fat', 'saturated', 'dont acides gras saturés', 'saturates'], expectedUnit: ['g'] },
    carbohydrates: { labels: ['total carbohydrate', 'carbohydrate', 'carbohydrates', 'glucides', 'carbs'], expectedUnit: ['g'] },
    sugar: { labels: ['sugars', 'sugar', 'dont sucres'], expectedUnit: ['g'] },
    fiber: { labels: ['dietary fiber', 'fiber', 'fibre', 'fibres alimentaires'], expectedUnit: ['g'] },
    protein: { labels: ['protein', 'protéines'], expectedUnit: ['g'] },
    sodium: { labels: ['sodium', 'salt', 'sel'], expectedUnit: ['mg', 'g'] }
  };

  const values = {};
  let foundAny = false;

  let basis = 'unknown';
  if (normalizedText.includes('per 100g') || normalizedText.includes('100 g')) basis = 'per 100g';
  else if (normalizedText.includes('per 100ml') || normalizedText.includes('100 ml')) basis = 'per 100ml';
  else if (normalizedText.includes('per serving') || normalizedText.includes('serving size')) basis = 'per serving';
  
  if (basis === 'unknown') warnings.push('Nutrition basis unknown (e.g., per 100g vs per serving).');

  const lines = normalizedText.split('\n');

  Object.keys(fields).forEach(key => {
    const config = fields[key];
    for (let line of lines) {
      if (config.labels.some(l => line.includes(l))) {
        let cleanLine = line.replace(/([0-9])o/gi, '$10').replace(/o([0-9])/gi, '0$1');
        cleanLine = cleanLine.replace(/([0-9])l/gi, '$11').replace(/l([0-9])/gi, '1$1');
        cleanLine = cleanLine.replace(/([0-9])s/gi, '$15').replace(/s([0-9])/gi, '5$1');

        const numMatch = cleanLine.match(/<?([0-9]+[.,]?[0-9]*)\s*(kcal|kj|g|mg|mcg)?/i);
        if (numMatch && numMatch[1]) {
          values[key] = parseFloat(numMatch[1].replace(',', '.'));
          foundAny = true;
          break;
        }
      }
    }
  });

  return { available: foundAny, basis, values };
};

/**
 * Tool: Vision Extractor
 * Deterministically extracts ingredients and nutrition data from raw OCR text.
 */
const extractVisionData = async (input, context) => {
  const { ocrText } = input;
  
  if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length === 0) {
    throw new Error('Valid OCR text string is required.');
  }

  const warnings = [];
  const normalizedText = ocrText.toLowerCase();

  const ingredientsResult = parseIngredients(ocrText, normalizedText, warnings);
  const nutritionResult = parseNutrition(normalizedText, warnings);

  if (!ingredientsResult.available) warnings.push('Ingredient section not found.');
  if (!nutritionResult.available) warnings.push('Nutrition section not found.');

  const validation = validateMacroCalories(nutritionResult.values);
  if (validation.status !== 'valid') {
    warnings.push(validation.reason);
  }

  // Construct structured product payload
  const productPayload = {
    identity: {
      name: 'Extracted Product', // Placeholder until label NLP is implemented
      brand: 'Unknown Brand',
      categories: [],
      productType: 'food'
    },
    serving: {
      servingSize: nutritionResult.basis === 'per serving' ? '1 serving' : '100g',
      servingSizeUnit: nutritionResult.basis.includes('ml') ? 'ml' : 'g'
    },
    ingredients: {
      rawIngredients: ingredientsResult.rawIngredients || '',
      ingredients: ingredientsResult.ingredients || [],
      allergens: [],
      additives: []
    },
    nutrition: normalizeNutrition({
      'energy-kcal_100g': nutritionResult.values.calories,
      'proteins_100g': nutritionResult.values.protein,
      'carbohydrates_100g': nutritionResult.values.carbohydrates,
      'sugars_100g': nutritionResult.values.sugar,
      'fat_100g': nutritionResult.values.fat,
      'saturated-fat_100g': nutritionResult.values.saturatedFat,
      'fiber_100g': nutritionResult.values.fiber,
      'sodium_100g': nutritionResult.values.sodium ? nutritionResult.values.sodium / 1000 : null
    }),
    source: {
      source: 'ocr_fallback',
      mimeType: input.mimeType || 'image/jpeg',
      sourceId: 'ocr_' + Date.now()
    },
    dataQuality: {
      dataQualityScore: nutritionResult.available ? 50 : 0
    }
  };

  return {
    product: productPayload,
    extractionConfidence: nutritionResult.available ? 'medium' : 'low',
    validationStatus: validation,
    warnings
  };
};

const extractMultimodalData = async (input, context) => {
  const ai = initAi();
  if (!ai) throw new Error('GEMINI_API_KEY is not configured for multimodal extraction.');
  
  const prompt = `
    Analyze this product image or document. Extract nutrition facts and ingredient information.
    For multi-page documents (like PDFs), return an object for each page that contains relevant information.
    If the document has only one page or information is centralized, return a single item array.
    DO NOT invent missing values. If a value is unreadable or not present, return null.
    Do NOT estimate or infer values.
  `;

  // Provide strict schema to Gemini
  const responseSchema = {
    type: Type.ARRAY,
    description: "Array of extractions (one per relevant page, or just one for single images).",
    items: {
      type: Type.OBJECT,
      properties: {
        productName: { type: Type.STRING, nullable: true },
        brand: { type: Type.STRING, nullable: true },
        servingSize: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            value: { type: Type.NUMBER, nullable: true },
            unit: { type: Type.STRING, nullable: true }
          }
        },
        nutrition: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER, nullable: true },
            protein: { type: Type.NUMBER, nullable: true },
            carbohydrates: { type: Type.NUMBER, nullable: true },
            sugars: { type: Type.NUMBER, nullable: true },
            totalFat: { type: Type.NUMBER, nullable: true },
            saturatedFat: { type: Type.NUMBER, nullable: true },
            transFat: { type: Type.NUMBER, nullable: true },
            fiber: { type: Type.NUMBER, nullable: true },
            sodium: { type: Type.NUMBER, nullable: true }
          }
        },
        rawIngredients: { type: Type.STRING, nullable: true },
        claims: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        allergens: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
        extractionConfidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
      },
      required: ["nutrition", "extractionConfidence"]
    }
  };

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  
  // Format Base64 content for Gemini InlineData
  const base64Data = input.fileContent.replace(/^data:(.*);base64,/, '');

  let response;
  try {
    response = await executeWithRetry(() => ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: input.mimeType || 'application/pdf' } }
        ]}
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1
      }
    }));
  } catch (error) {
    console.error("[Vision Extractor Error]", error.message || error.type || error);
    throw error;
  }

  const parsedArray = JSON.parse(response.text);
  if (!parsedArray || parsedArray.length === 0) {
    throw new Error('No nutrition or ingredient data found in the provided document.');
  }

  const warnings = [];
  let mergedData = parsedArray[0];

  // Conflict resolution for multi-page extraction
  if (parsedArray.length > 1) {
    for (let i = 1; i < parsedArray.length; i++) {
      const page = parsedArray[i];
      // Check for conflicts
      if (page.nutrition) {
        for (const [key, val] of Object.entries(page.nutrition)) {
          if (val !== null && mergedData.nutrition[key] !== null && val !== mergedData.nutrition[key]) {
            warnings.push(`Conflicting ${key} values were detected across document pages (${mergedData.nutrition[key]} vs ${val}). Using first detected value.`);
          } else if (val !== null && mergedData.nutrition[key] === null) {
             mergedData.nutrition[key] = val; // Merge missing
          }
        }
      }
      if (page.rawIngredients && !mergedData.rawIngredients) {
        mergedData.rawIngredients = page.rawIngredients;
      }
    }
  }

  // Map to canonical internal format
  const normalizedNutrition = normalizeNutrition({
    'energy-kcal_100g': mergedData.nutrition.calories,
    'proteins_100g': mergedData.nutrition.protein,
    'carbohydrates_100g': mergedData.nutrition.carbohydrates,
    'sugars_100g': mergedData.nutrition.sugars,
    'fat_100g': mergedData.nutrition.totalFat,
    'saturated-fat_100g': mergedData.nutrition.saturatedFat,
    'fiber_100g': mergedData.nutrition.fiber,
    'sodium_100g': mergedData.nutrition.sodium ? mergedData.nutrition.sodium / 1000 : null
  });

  const validation = validateMacroCalories(mergedData.nutrition);
  if (validation.status !== 'valid' && validation.status !== 'unvalidatable') {
    warnings.push(validation.reason);
  }

  const parsedIngredients = parseIngredientList(mergedData.rawIngredients || '');

  const productPayload = {
    identity: {
      name: mergedData.productName || 'Extracted Product',
      brand: mergedData.brand || 'Unknown Brand',
      categories: [],
      productType: 'food'
    },
    serving: {
      servingSize: mergedData.servingSize?.value ? `${mergedData.servingSize.value} ${mergedData.servingSize.unit || 'g'}` : '100g',
      servingSizeUnit: mergedData.servingSize?.unit || 'g'
    },
    ingredients: {
      rawIngredients: mergedData.rawIngredients || '',
      ingredients: parsedIngredients,
      allergens: mergedData.allergens || [],
      additives: []
    },
    nutrition: normalizedNutrition,
    source: {
      source: 'gemini_multimodal',
      mimeType: input.mimeType || 'image/jpeg',
      sourceId: 'vision_' + Date.now()
    },
    dataQuality: {
      dataQualityScore: mergedData.extractionConfidence === 'high' ? 90 : 50
    }
  };

  return {
    product: productPayload,
    extractionConfidence: mergedData.extractionConfidence,
    validationStatus: validation,
    warnings
  };
};

module.exports = {
  name: 'vision_extractor',
  description: 'Multimodal vision extractor supporting structured JSON payload extraction from Images and PDFs. Falls back to deterministic text parsing if LLM is unavailable.',
  inputSchema: {
    ocrText: { type: 'string', required: false },
    fileContent: { type: 'string', required: false }, // base64 representation
    mimeType: { type: 'string', required: false }
  },
  execute: async (input, context) => {
    if (!input.ocrText && !input.fileContent) {
      throw new Error('Must provide either ocrText or fileContent.');
    }

    // Prefer true multimodal processing if fileContent is provided
    if (input.fileContent && process.env.GEMINI_API_KEY) {
      try {
        return await extractMultimodalData(input, context);
      } catch (err) {
        console.warn('Multimodal extraction failed, falling back to OCR text if available.', err.message);
        if (!input.ocrText) throw new Error('Multimodal extraction failed and no OCR text available for fallback.');
      }
    }
    
    // For now, if we have ocrText or multimodal failed, run the deterministic fallback pipeline
    if (input.ocrText) {
      return await extractVisionData(input, context);
    }
  }
};
