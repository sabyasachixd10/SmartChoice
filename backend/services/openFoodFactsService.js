const axios = require('axios');
const { normalizeNutrition } = require('./nutritionNormalizationService');
const { calculateDataCompleteness } = require('./dataQualityService');

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2';
const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'SmartChoice - Web - Version 1.0 - www.smartchoice.local'
  }
});

const normalizeProduct = (data) => {
  if (!data || !data.code) return null;

  const nutrition = normalizeNutrition(data.nutriments);
  
  const product = {
    identity: {
      barcode: data.code,
      name: data.product_name || 'Unknown Product',
      brand: data.brands || '',
      categories: data.categories ? data.categories.split(',').map(c => c.trim()) : [],
      productType: 'food'
    },
    serving: {
      servingSize: data.serving_size || '',
      servingSizeUnit: 'g' // OFF usually uses string like "100 g"
    },
    media: {
      imageUrl: data.image_url || '',
      productUrl: `https://world.openfoodfacts.org/product/${data.code}`
    },
    ingredients: {
      ingredients: data.ingredients_text ? data.ingredients_text.split(',').map(i => i.trim()) : [],
      allergens: data.allergens_tags ? data.allergens_tags.map(a => a.replace('en:', '')) : [],
      additives: data.additives_tags ? data.additives_tags.map(a => a.replace('en:', '')) : []
    },
    nutrition,
    processing: {
      level: data.nova_group ? `NOVA ${data.nova_group}` : 'Unknown',
      novaGroup: data.nova_group || null,
      labels: data.labels_tags ? data.labels_tags.map(l => l.replace('en:', '')) : []
    },
    source: {
      source: 'OpenFoodFacts',
      sourceId: data.code,
      lastUpdated: new Date()
    }
  };

  const quality = calculateDataCompleteness(product);
  product.dataQuality = {
    completeness: quality.score,
    missingNutritionFields: Object.keys(nutrition).filter(k => nutrition[k] === null),
    dataQualityScore: quality.score
  };

  return product;
};

const getProductByBarcode = async (barcode) => {
  try {
    const response = await axiosInstance.get(`${OFF_API_URL}/product/${barcode}.json`);
    
    if (response.data.status !== 1) {
      return null;
    }

    return normalizeProduct(response.data.product);
  } catch (error) {
    console.error(`Error fetching product ${barcode} from OFF:`, error.message);
    if (error.response && error.response.status === 404) return null;
    throw new Error('Failed to retrieve product from Open Food Facts');
  }
};

const searchProducts = async (query, limit = 10) => {
  try {
    const response = await axiosInstance.get(OFF_SEARCH_URL, {
      params: {
        search_terms: query,
        search_simple: 1,
        action: 'process',
        json: 1,
        page_size: limit
      }
    });

    if (!response.data || !response.data.products) {
      return [];
    }

    return response.data.products
      .map(normalizeProduct)
      .filter(p => p !== null && p.identity.name !== 'Unknown Product');
  } catch (error) {
    console.error(`Error searching products for "${query}" from OFF:`, error.message);
    throw new Error('Failed to search products from Open Food Facts');
  }
};

module.exports = {
  getProductByBarcode,
  searchProducts,
  normalizeProduct
};
