const normalizeNutritionValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return null;
  }
  return Number(value);
};

const normalizeNutrition = (nutriments) => {
  if (!nutriments) return {};

  return {
    calories: normalizeNutritionValue(nutriments['energy-kcal_100g']),
    protein: normalizeNutritionValue(nutriments['proteins_100g']),
    carbohydrates: normalizeNutritionValue(nutriments['carbohydrates_100g']),
    sugar: normalizeNutritionValue(nutriments['sugars_100g']),
    fat: normalizeNutritionValue(nutriments['fat_100g']),
    saturatedFat: normalizeNutritionValue(nutriments['saturated-fat_100g']),
    fiber: normalizeNutritionValue(nutriments['fiber_100g']),
    sodium: normalizeNutritionValue(nutriments['sodium_100g'] ? nutriments['sodium_100g'] * 1000 : null) // mg
  };
};

module.exports = {
  normalizeNutrition,
  normalizeNutritionValue
};
