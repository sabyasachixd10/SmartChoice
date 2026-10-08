const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('./config/database');

const barcodeResolverTool = require('./services/barcodeResolver');
const globalProductQueryTool = require('./services/globalProductQueryService');
const visionExtractorTool = require('./services/visionExtractor');
const fssaiTool = require('./services/fssaiService');

const { validateMacroCalories } = require('./services/dataQualityService');
const AgentActions = require('./agent/agentActions');
const toolRegistry = require('./agent/toolRegistry');

const Product = require('./models/Product');

const runTests = async () => {
  try {
    // ... [existing DB connect] ...
    await connectDB();
    console.log('Connected to MongoDB.\n');
    toolRegistry.registerTool(barcodeResolverTool);
    toolRegistry.registerTool(globalProductQueryTool);
    toolRegistry.registerTool(visionExtractorTool);
    toolRegistry.registerTool(fssaiTool);

    const context = { sessionId: 'test_session', activeComparisonList: [] };

    // --- BARCODE TESTS ---
    console.log('--- BARCODE TESTS ---');
    try {
      await toolRegistry.executeTool('barcode_resolver', { barcode: null }, context);
      console.log('Invalid barcode: FAIL (did not throw)');
    } catch (e) {
      console.log('Invalid barcode: PASS');
    }
    const fakeBarcode = '9999999999999';
    const offResult = await toolRegistry.executeTool('barcode_resolver', { barcode: fakeBarcode }, context);
    console.log('OFF failure fallback:', offResult.source === 'not_found' ? 'PASS' : 'FAIL');
    
    // --- GLOBAL QUERY TESTS ---
    console.log('\n--- GLOBAL QUERY TESTS ---');
    const proteinQuery = await toolRegistry.executeTool('global_product_query', { metric: 'protein', limit: 5 }, context);
    console.log('Highest protein:', proteinQuery.results.length <= 5 && proteinQuery.queryMetadata.metric === 'protein' ? 'PASS' : 'FAIL');
    const sugarQuery = await toolRegistry.executeTool('global_product_query', { metric: 'sugar', direction: 'asc', limit: 3 }, context);
    console.log('Lowest sugar:', sugarQuery.results.length <= 3 && sugarQuery.queryMetadata.direction === 'asc' ? 'PASS' : 'FAIL');
    try {
      await toolRegistry.executeTool('global_product_query', { metric: 'invalid_metric' }, context);
      console.log('Invalid metric: FAIL');
    } catch (e) { console.log('Invalid metric: PASS'); }

    // --- NUTRITION VALIDATION TESTS ---
    console.log('\n--- NUTRITION VALIDATION TESTS ---');
    const perfectMacro = validateMacroCalories({ protein: 10, carbohydrates: 20, fat: 5, calories: 165 });
    console.log('Macro valid:', perfectMacro.status === 'valid' ? 'PASS' : 'FAIL');
    const warningMacro = validateMacroCalories({ protein: 10, carbohydrates: 20, fat: 5, calories: 145 }); // Diff ~12%
    console.log('Macro warning:', warningMacro.status === 'warning' ? 'PASS' : 'FAIL');
    const invalidMacro = validateMacroCalories({ protein: 10, carbohydrates: 20, fat: 5, calories: 300 }); // Diff > 20%
    console.log('Macro review_required:', invalidMacro.status === 'review_required' ? 'PASS' : 'FAIL');
    const missingMacro = validateMacroCalories({ protein: null, carbohydrates: null, fat: null, calories: 100 });
    console.log('Missing macros:', missingMacro.status === 'warning' ? 'PASS' : 'FAIL');

    // --- VISION & INGREDIENT TESTS ---
    console.log('\n--- VISION & INGREDIENT TESTS ---');
    const ocrArtifacts = `Ingredients: Whole Grain Oats, Sugar; Milk Solids\n\n[INS 330] \nSalt`;
    const visionResult = await toolRegistry.executeTool('vision_extractor', { ocrText: ocrArtifacts }, context);
    const ings = visionResult.product.ingredients.ingredients;
    console.log('Parsed ingredients correctly:', ings.includes('Whole Grain Oats') && ings.includes('INS 330') ? 'PASS' : 'FAIL');
    
    try {
      await toolRegistry.executeTool('vision_extractor', { mimeType: 'application/pdf' }, context);
      console.log('PDF without LLM/ocr text: FAIL (did not throw)');
    } catch (e) {
      console.log('PDF without LLM/ocr text: PASS (threw as expected)');
    }

    // --- FSSAI TESTS ---
    console.log('\n--- FSSAI TESTS ---');
    const fssaiCheck = await toolRegistry.executeTool('fssai_compliance_checker', { product: visionResult.product }, context);
    const hasKnownAdditive = fssaiCheck.additiveAnalysis.some(a => a.identifiedAs.toLowerCase() === 'ins 330' && a.status === 'permitted');
    const hasKnownAllergen = fssaiCheck.ingredientAnalysis.some(i => i.identifiedAs.toLowerCase() === 'milk solids' && i.isAllergen === true);
    const hasUnknown = fssaiCheck.ingredientAnalysis.some(i => i.status === 'unknown');
    console.log('Known additive (INS 330):', hasKnownAdditive ? 'PASS' : 'FAIL');
    console.log('Known allergen (Milk Solids):', hasKnownAllergen ? 'PASS' : 'FAIL');
    console.log('Unknown ingredient fallback:', hasUnknown ? 'PASS' : 'FAIL');

    console.log('\nAll phase D tests completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
};

runTests();
