const Product = require('../models/Product');

const NUTRITION_FIELDS = [
  { key: 'calories', name: 'Calories', unit: 'kcal' },
  { key: 'protein', name: 'Protein', unit: 'g' },
  { key: 'carbohydrates', name: 'Carbohydrates', unit: 'g' },
  { key: 'sugar', name: 'Sugar', unit: 'g' },
  { key: 'fat', name: 'Fat', unit: 'g' },
  { key: 'saturatedFat', name: 'Saturated Fat', unit: 'g' },
  { key: 'fiber', name: 'Fiber', unit: 'g' },
  { key: 'sodium', name: 'Sodium', unit: 'mg' }
];

const compareArrays = (arrays) => {
  // Find common items across all arrays
  if (arrays.length === 0) return { common: [], unique: [] };
  
  // Flatten and count occurrences
  const counts = {};
  arrays.forEach((arr, idx) => {
    const uniqueInArr = new Set(arr.map(a => a.toLowerCase().trim()));
    uniqueInArr.forEach(item => {
      if (!counts[item]) counts[item] = { total: 0, presentIn: [] };
      counts[item].total += 1;
      counts[item].presentIn.push(idx);
    });
  });

  const common = [];
  const unique = arrays.map(() => []);

  for (const [item, data] of Object.entries(counts)) {
    if (data.total === arrays.length) {
      common.push(item);
    } else {
      data.presentIn.forEach(idx => {
        unique[idx].push(item);
      });
    }
  }

  return { common, unique };
};

const compareProducts = async (productIds) => {
  if (!productIds || productIds.length < 2 || productIds.length > 5) {
    throw new Error('Please provide between 2 and 5 product IDs');
  }

  // Ensure unique IDs
  const uniqueIds = [...new Set(productIds)];
  if (uniqueIds.length !== productIds.length) {
    throw new Error('Duplicate product IDs are not allowed');
  }

  const products = await Product.find({ _id: { $in: uniqueIds } });
  
  // Maintain order
  const orderedProducts = uniqueIds.map(id => products.find(p => p._id.toString() === id)).filter(p => p);

  if (orderedProducts.length < 2) {
    throw new Error('Could not find enough products for comparison');
  }

  // 1. Nutrition Comparison
  const nutritionComparison = {};
  const keyDifferences = [];

  NUTRITION_FIELDS.forEach(field => {
    const values = orderedProducts.map(p => p.nutrition?.[field.key]);
    nutritionComparison[field.key] = {
      name: field.name,
      unit: field.unit,
      values: values
    };

    // Calculate diffs between the first two products as key differences
    if (orderedProducts.length === 2) {
      const v1 = values[0];
      const v2 = values[1];
      if (v1 !== null && v2 !== null && v1 !== undefined && v2 !== undefined) {
        const diff = v2 - v1;
        if (Math.abs(diff) > 0) {
          const sign = diff > 0 ? '+' : '';
          const p1Name = orderedProducts[0].identity?.name;
          const p2Name = orderedProducts[1].identity?.name;
          const diffFormatted = parseFloat(diff.toFixed(2));
          const stmt = `${p2Name} contains ${Math.abs(diffFormatted)}${field.unit} ${diff > 0 ? 'more' : 'less'} ${field.name.toLowerCase()} per 100g compared to ${p1Name}.`;
          
          keyDifferences.push({
            metric: field.key,
            productA: v1,
            productB: v2,
            difference: diffFormatted,
            unit: field.unit,
            statement: stmt
          });
        }
      }
    }
  });

  // 2. Ingredient Comparison
  const ingredientsLists = orderedProducts.map(p => p.ingredients?.ingredients || []);
  const ingComp = compareArrays(ingredientsLists);
  const ingredientComparison = {
    counts: ingredientsLists.map(l => l.length),
    common: ingComp.common,
    unique: ingComp.unique
  };

  // 3. Additive Comparison
  const additivesLists = orderedProducts.map(p => p.ingredients?.additives || []);
  const addComp = compareArrays(additivesLists);
  const additiveComparison = {
    counts: additivesLists.map(l => l.length),
    common: addComp.common,
    unique: addComp.unique
  };

  // 4. Allergen Comparison
  const allergensLists = orderedProducts.map(p => p.ingredients?.allergens || []);
  const allComp = compareArrays(allergensLists);
  const allergenComparison = {
    common: allComp.common,
    unique: allComp.unique
  };

  // 5. Processing Comparison
  const processingComparison = orderedProducts.map(p => ({
    level: p.processing?.level || 'Unknown',
    novaGroup: p.processing?.novaGroup || null,
    labels: p.processing?.labels || []
  }));

  return {
    products: orderedProducts,
    nutritionComparison,
    ingredientComparison,
    additiveComparison,
    allergenComparison,
    processingComparison,
    keyDifferences
  };
};

module.exports = {
  compareProducts
};
