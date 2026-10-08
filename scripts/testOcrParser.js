import { parseOcrText } from '../frontend/src/services/ocrParser.js';

// Simple script to test the OCR parsing heuristics locally.
// Run using Node.js: node scripts/testOcrParser.js

const runTests = () => {
  console.log("Running OCR Parser Tests...\n");

  const tests = [
    {
      name: "Clean ingredient list with nutrition",
      text: `
      INGREDIENTS: Whole wheat flour, water, sugar, yeast, salt, soybean oil.
      Contains: Wheat, Soy.
      
      Nutrition Facts
      Serving size 1 slice
      Amount per serving
      Calories 100
      Total Fat 1.5g
      Saturated Fat 0g
      Sodium 150mg
      Total Carbohydrate 18g
      Dietary Fiber 2g
      Sugars 3g
      Protein 4g
      `
    },
    {
      name: "Per 100g basis with common OCR errors (O instead of 0)",
      text: `
      Ingredients: Milk, sugar, cocoa butter, cocoa mass.
      
      NUTRITIONAL INFORMATION PER 100g
      Energy 530 kcal
      Fat 3Oo g
      of which saturates 18 g
      Carbohydrates 55g
      of which sugars 5O g
      Fibre 2,5g
      Protein 7g
      Salt 0.2g
      `
    },
    {
      name: "Incomplete / Ambiguous text",
      text: `
      Some random text here.
      Made in France.
      Keep refrigerated.
      `
    }
  ];

  tests.forEach((t, i) => {
    console.log(`--- Test ${i + 1}: ${t.name} ---`);
    const result = parseOcrText(t.text);
    console.log(`Available: ${result.available}`);
    console.log(`Warnings: ${JSON.stringify(result.warnings)}`);
    console.log(`Ingredients Detected: ${result.ingredients.available}`);
    if (result.ingredients.available) {
      console.log(`Ingredient Text: "${result.ingredients.text}"`);
    }
    console.log(`Nutrition Detected: ${result.nutrition.available}`);
    if (result.nutrition.available) {
      console.log(`Nutrition Basis: ${result.nutrition.basis}`);
      console.log(`Parsed Values:`, result.nutrition.values);
    }
    console.log("\n");
  });
};

runTests();
