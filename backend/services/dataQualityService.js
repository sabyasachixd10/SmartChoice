const calculateDataCompleteness = (product) => {
  let score = 0;
  let totalFields = 8;
  const missingFields = [];

  if (product.identity?.name) score += 1;
  else missingFields.push('name');

  if (product.identity?.brand) score += 1;
  else missingFields.push('brand');

  if (product.media?.imageUrl) score += 1;
  else missingFields.push('image');

  if (product.ingredients?.ingredients?.length > 0) score += 1;
  else missingFields.push('ingredients');

  const nutrition = product.nutrition || {};
  if (nutrition.calories !== null && nutrition.protein !== null) score += 1;
  else missingFields.push('nutrition');

  if (product.ingredients?.allergens?.length > 0) score += 1;
  else missingFields.push('allergens');

  if (product.ingredients?.additives?.length > 0) score += 1;
  else missingFields.push('additives');

  if (product.processing?.novaGroup) score += 1;
  else missingFields.push('processing');

  const percentage = Math.round((score / totalFields) * 100);

  return {
    score: percentage,
    missingFields
  };
};

const validateMacroCalories = (nutrition, thresholds = { warning: 0.10, review: 0.20 }) => {
  if (!nutrition) {
    return { status: 'invalid', reason: 'Missing nutrition data completely.' };
  }

  const p = nutrition.protein;
  const c = nutrition.carbohydrates;
  const f = nutrition.fat;
  
  if (p === null && c === null && f === null) {
     return { status: 'warning', reason: 'Macronutrients missing, cannot validate stated calories.' };
  }

  const calcP = p || 0;
  const calcC = c || 0;
  const calcF = f || 0;

  const calculatedCalories = (calcP * 4) + (calcC * 4) + (calcF * 9);
  const statedCalories = nutrition.calories;

  if (statedCalories === null || statedCalories === undefined) {
    return { 
      status: 'warning', 
      reason: 'Stated calories missing. Calculated from macros: ' + Math.round(calculatedCalories), 
      calculated: calculatedCalories 
    };
  }

  const diff = Math.abs(calculatedCalories - statedCalories);
  const ratioDiff = statedCalories === 0 
    ? (calculatedCalories > 10 ? 1 : 0) 
    : (diff / statedCalories);

  let status = 'valid';
  let reason = 'Macros match stated calories within acceptable bounds.';

  if (ratioDiff > thresholds.review) {
    status = 'review_required';
    reason = `Calculated calories (${Math.round(calculatedCalories)}) deviate by ${(ratioDiff * 100).toFixed(1)}% from stated (${statedCalories}). Review required.`;
  } else if (ratioDiff > thresholds.warning) {
    status = 'warning';
    reason = `Calculated calories (${Math.round(calculatedCalories)}) deviate by ${(ratioDiff * 100).toFixed(1)}% from stated (${statedCalories}).`;
  }

  return {
    status,
    reason,
    calculatedCalories: Math.round(calculatedCalories),
    statedCalories,
    deviation: ratioDiff
  };
};

module.exports = {
  calculateDataCompleteness,
  validateMacroCalories
};
