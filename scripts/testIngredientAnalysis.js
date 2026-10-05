const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Product = require('../backend/models/Product');
const ingredientAnalysisService = require('../backend/services/ingredientAnalysisService');

const runTests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test F: empty/malformed ingredient input
    console.log('\n--- Test F: Empty/Malformed Input ---');
    const emptyProduct = new Product({ identity: { barcode: '0000', name: 'Empty Product' } });
    const emptyAnalysis = ingredientAnalysisService.analyzeProduct(emptyProduct);
    console.log('Available?', emptyAnalysis.ingredientAnalysis.available); // Should be false
    
    // Test D: missing ingredient data
    console.log('\n--- Test D: Missing ingredient data ---');
    console.log('Limitations:', emptyAnalysis.limitations);

    // Fetch real products
    const products = await Product.find({}).limit(50);
    console.log(`\nFetched ${products.length} products for testing.`);

    let foundIngredients = false;
    let foundAdditives = false;
    let foundAllergens = false;
    let foundMissingIngredients = false;
    let foundMissingAdditives = false;

    for (const product of products) {
      const analysis = ingredientAnalysisService.analyzeProduct(product);
      
      const hasIng = analysis.ingredientAnalysis.available;
      const hasAdd = analysis.additiveAnalysis.available;
      const hasAllergens = analysis.allergenAnalysis.available;

      if (hasIng && !foundIngredients) {
        console.log('\n--- Test A: Normal product with ingredients ---');
        console.log('Product:', product.identity.name);
        console.log('Count:', analysis.ingredientAnalysis.ingredientCount);
        console.log('Leading:', analysis.ingredientAnalysis.leadingIngredients.map(i => i.normalizedName));
        foundIngredients = true;
      }

      if (hasAdd && !foundAdditives) {
        console.log('\n--- Test B: Product containing additives ---');
        console.log('Product:', product.identity.name);
        console.log('Additives:', analysis.additiveAnalysis.additives.map(a => a.name));
        foundAdditives = true;
      }

      if (hasAllergens && !foundAllergens) {
        console.log('\n--- Test C: Product with allergens ---');
        console.log('Product:', product.identity.name);
        console.log('Allergens:', analysis.allergenAnalysis.allergens);
        foundAllergens = true;
      }

      if (!hasIng && !foundMissingIngredients) {
        console.log('\n--- Test D: Missing ingredient data ---');
        console.log('Product:', product.identity.name);
        console.log('Limitations:', analysis.limitations);
        foundMissingIngredients = true;
      }

      if (hasIng && !hasAdd && !foundMissingAdditives) {
        console.log('\n--- Test E: Missing additive data (but has ingredients) ---');
        console.log('Product:', product.identity.name);
        console.log('Limitations:', analysis.limitations);
        foundMissingAdditives = true;
      }
    }

    // Test G: multiple products
    console.log('\n--- Test G: Multiple products (Summary) ---');
    console.log('Tested', products.length, 'products successfully without crashing.');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
};

runTests();
