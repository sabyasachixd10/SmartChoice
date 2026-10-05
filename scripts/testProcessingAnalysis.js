const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Product = require('../backend/models/Product');
const processingAnalysisService = require('../backend/services/processingAnalysisService');

const runTests = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Test F: empty/malformed processing input
    console.log('\n--- Test F: Empty/Malformed Input ---');
    const emptyProduct = new Product({ identity: { barcode: '0000', name: 'Empty Product' } });
    const emptyAnalysis = processingAnalysisService.analyzeProcessing(emptyProduct);
    console.log('NOVA Available?', emptyAnalysis.nova.available); // Should be false
    console.log('Limitations:', emptyAnalysis.limitations);
    
    // Test D & E: missing data
    console.log('\n--- Test D & E: Missing data ---');
    console.log('Limitations:', emptyAnalysis.limitations);

    // Fetch real products
    const products = await Product.find({}).limit(50);
    console.log(`\nFetched ${products.length} products for testing.`);

    let foundNova = false;
    let foundIndicators = false;
    let foundPrep = false;

    for (const product of products) {
      const analysis = processingAnalysisService.analyzeProcessing(product);
      
      const hasNova = analysis.nova.available;
      const hasIndicators = analysis.processingIndicators.available;
      const hasPrep = analysis.preparation.available;

      if (hasNova && !foundNova) {
        console.log('\n--- Test A: Product with NOVA classification ---');
        console.log('Product:', product.identity.name);
        console.log('NOVA:', analysis.nova);
        foundNova = true;
      }

      if (hasIndicators && !foundIndicators) {
        console.log('\n--- Test B: Product with processing metadata ---');
        console.log('Product:', product.identity.name);
        console.log('Indicators:', analysis.processingIndicators.indicators.slice(0, 5));
        foundIndicators = true;
      }

      if (hasPrep && !foundPrep) {
        console.log('\n--- Test C: Product with explicit preparation ---');
        console.log('Product:', product.identity.name);
        console.log('Preparation:', analysis.preparation.methods);
        foundPrep = true;
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
