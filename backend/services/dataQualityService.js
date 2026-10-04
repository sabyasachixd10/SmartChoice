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

module.exports = {
  calculateDataCompleteness
};
