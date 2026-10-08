const Product = require('../models/Product');

const ALLOWED_METRICS = ['protein', 'sugar', 'fiber', 'calories', 'fat', 'saturatedFat', 'carbohydrates', 'sodium'];
const ALLOWED_DIRECTIONS = ['asc', 'desc'];

/**
 * Tool: Global Product Query
 * Deterministic MongoDB querying for generalized product questions based on normalized nutrition.
 */
const executeGlobalQuery = async (input, context) => {
  const { metric, direction = 'desc', limit = 10, filters = {} } = input;
  
  if (!ALLOWED_METRICS.includes(metric)) {
    throw new Error(`Invalid metric. Allowed metrics are: ${ALLOWED_METRICS.join(', ')}`);
  }
  if (!ALLOWED_DIRECTIONS.includes(direction)) {
    throw new Error(`Invalid direction. Allowed directions are: 'asc', 'desc'`);
  }

  // Safety limits
  const safeLimit = Math.min(Math.max(1, parseInt(limit, 10)), 50);

  const sortObj = {};
  sortObj[`nutrition.${metric}`] = direction === 'desc' ? -1 : 1;

  const queryObj = {};
  
  // Safe filtering logic
  if (filters && typeof filters === 'object') {
    for (const [key, filterVals] of Object.entries(filters)) {
      if (ALLOWED_METRICS.includes(key) && typeof filterVals === 'object') {
        queryObj[`nutrition.${key}`] = {};
        if (filterVals.lt !== undefined) queryObj[`nutrition.${key}`].$lt = Number(filterVals.lt);
        if (filterVals.gt !== undefined) queryObj[`nutrition.${key}`].$gt = Number(filterVals.gt);
        if (filterVals.lte !== undefined) queryObj[`nutrition.${key}`].$lte = Number(filterVals.lte);
        if (filterVals.gte !== undefined) queryObj[`nutrition.${key}`].$gte = Number(filterVals.gte);
      } else if (key === 'category' && typeof filterVals === 'string') {
        queryObj['identity.categories'] = { $regex: filterVals, $options: 'i' };
      }
    }
  }

  // Ensure primary metric exists (not null)
  queryObj[`nutrition.${metric}`] = { ...queryObj[`nutrition.${metric}`], $ne: null };

  const products = await Product.find(queryObj)
    .sort(sortObj)
    .limit(safeLimit)
    .lean();
  
  return {
    results: products,
    count: products.length,
    queryMetadata: { metric, direction, limit: safeLimit, filters }
  };
};

module.exports = {
  name: 'global_product_query',
  description: 'Executes a deterministic MongoDB query for products based on specific nutrition metrics (e.g., highest protein, lowest sugar). Cannot use arbitrary operators.',
  inputSchema: {
    metric: { type: 'string', required: true, enum: ALLOWED_METRICS },
    direction: { type: 'string', default: 'desc', enum: ALLOWED_DIRECTIONS },
    limit: { type: 'number', default: 10 },
    filters: { type: 'object' }
  },
  execute: executeGlobalQuery
};
