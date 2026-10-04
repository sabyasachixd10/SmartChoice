const UserPreference = require('../models/UserPreference');

const getDefaultPreferences = () => {
  return {
    highProtein: false,
    lowSugar: false,
    lowCalories: false,
    lowSaturatedFat: false,
    lowSodium: false,
    highFiber: false,
    vegetarian: false,
    vegan: false,
    avoidAllergens: [],
    avoidIngredients: [],
    preferredCategories: [],
    excludedCategories: [],
    preferredBrands: [],
    excludedBrands: [],
    maxCalories: null,
    maxSugar: null,
    minProtein: null,
    minFiber: null
  };
};

const normalizeArray = (arr) => {
  if (!arr || !Array.isArray(arr)) return [];
  return arr
    .filter(item => typeof item === 'string')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0 && item.length < 100); // prevent huge strings
};

const normalizePreferences = (input = {}) => {
  const defaults = getDefaultPreferences();
  
  return {
    highProtein: Boolean(input.highProtein ?? defaults.highProtein),
    lowSugar: Boolean(input.lowSugar ?? defaults.lowSugar),
    lowCalories: Boolean(input.lowCalories ?? defaults.lowCalories),
    lowSaturatedFat: Boolean(input.lowSaturatedFat ?? defaults.lowSaturatedFat),
    lowSodium: Boolean(input.lowSodium ?? defaults.lowSodium),
    highFiber: Boolean(input.highFiber ?? defaults.highFiber),
    vegetarian: Boolean(input.vegetarian ?? defaults.vegetarian),
    vegan: Boolean(input.vegan ?? defaults.vegan),
    
    avoidAllergens: normalizeArray(input.avoidAllergens),
    avoidIngredients: normalizeArray(input.avoidIngredients),
    preferredCategories: normalizeArray(input.preferredCategories),
    excludedCategories: normalizeArray(input.excludedCategories),
    preferredBrands: normalizeArray(input.preferredBrands),
    excludedBrands: normalizeArray(input.excludedBrands),
    
    maxCalories: typeof input.maxCalories === 'number' && input.maxCalories > 0 ? input.maxCalories : null,
    maxSugar: typeof input.maxSugar === 'number' && input.maxSugar >= 0 ? input.maxSugar : null,
    minProtein: typeof input.minProtein === 'number' && input.minProtein >= 0 ? input.minProtein : null,
    minFiber: typeof input.minFiber === 'number' && input.minFiber >= 0 ? input.minFiber : null
  };
};

const mergePreferences = (base, updates) => {
  return normalizePreferences({ ...base, ...updates });
};

module.exports = {
  getDefaultPreferences,
  normalizePreferences,
  mergePreferences
};
