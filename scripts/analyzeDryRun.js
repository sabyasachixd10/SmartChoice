const fs = require('fs');
const path = require('path');

const processedFile = path.join(__dirname, '../data/processed/products_india.json');
const rawFileDir = path.join(__dirname, '../data/raw/openfoodfacts_india');
const reportFile = path.join(__dirname, '../evaluation/ingestionReport.json');

const products = JSON.parse(fs.readFileSync(processedFile, 'utf8'));
const ingestionReport = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

let missingNutrition = 0;
let missingIngredients = 0;
let missingServing = 0;
let missingImages = 0;

const props = {
  energy: 0, protein: 0, carbs: 0, fat: 0, satFat: 0, sugar: 0, fiber: 0, sodium: 0,
  ingredients: 0, additives: 0, allergens: 0, nova: 0, image: 0
};

products.forEach(p => {
  const nut = p.nutrition || {};
  const ing = p.ingredients || {};
  
  if (Object.keys(nut).length === 0 || Object.values(nut).every(v => v === null)) missingNutrition++;
  if (!ing.ingredients || ing.ingredients.length === 0) missingIngredients++;
  if (!p.serving || !p.serving.servingSize) missingServing++;
  if (!p.media || !p.media.imageUrl) missingImages++;
  
  if (nut.energyKcal !== null || nut.energyKj !== null) props.energy++;
  if (nut.proteins !== null) props.protein++;
  if (nut.carbohydrates !== null) props.carbs++;
  if (nut.fat !== null) props.fat++;
  if (nut.saturatedFat !== null) props.satFat++;
  if (nut.sugars !== null) props.sugar++;
  if (nut.fiber !== null) props.fiber++;
  if (nut.sodium !== null) props.sodium++;
  
  if (ing.ingredients && ing.ingredients.length > 0) props.ingredients++;
  if (ing.additives && ing.additives.length > 0) props.additives++;
  if (ing.allergens && ing.allergens.length > 0) props.allergens++;
  
  if (p.processing && p.processing.novaGroup !== null) props.nova++;
  if (p.media && p.media.imageUrl) props.image++;
});

// Top 20 brands
const brands = {};
products.forEach(p => {
  const b = p.identity.brand || 'Unknown';
  brands[b] = (brands[b] || 0) + 1;
});
const topBrands = Object.entries(brands).sort((a,b) => b[1]-a[1]).slice(0, 20);

// File sizes
const rawFiles = fs.readdirSync(rawFileDir).filter(f => f.startsWith('snapshot_'));
const rawFile = rawFiles[rawFiles.length - 1]; // latest
const rawStats = fs.statSync(path.join(rawFileDir, rawFile));
const procStats = fs.statSync(processedFile);
const repStats = fs.statSync(reportFile);

console.log(JSON.stringify({
  missing: { missingNutrition, missingIngredients, missingServing, missingImages },
  quality: {
    energy: (props.energy / products.length) * 100,
    protein: (props.protein / products.length) * 100,
    carbs: (props.carbs / products.length) * 100,
    fat: (props.fat / products.length) * 100,
    satFat: (props.satFat / products.length) * 100,
    sugar: (props.sugar / products.length) * 100,
    fiber: (props.fiber / products.length) * 100,
    sodium: (props.sodium / products.length) * 100,
    ingredients: (props.ingredients / products.length) * 100,
    additives: (props.additives / products.length) * 100,
    allergens: (props.allergens / products.length) * 100,
    nova: (props.nova / products.length) * 100,
    image: (props.image / products.length) * 100
  },
  topBrands,
  files: {
    raw: { name: rawFile, size: rawStats.size },
    processed: { name: 'products_india.json', size: procStats.size },
    report: { name: 'ingestionReport.json', size: repStats.size }
  }
}, null, 2));
