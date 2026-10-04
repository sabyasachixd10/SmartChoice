const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  identity: {
    barcode: { type: String, required: true, index: true, unique: true },
    name: { type: String, required: true, index: true },
    brand: { type: String, index: true },
    categories: { type: [String], index: true },
    productType: { type: String }
  },
  serving: {
    servingSize: { type: String },
    servingSizeUnit: { type: String }
  },
  media: {
    imageUrl: { type: String },
    productUrl: { type: String }
  },
  ingredients: {
    ingredients: { type: [String] },
    allergens: { type: [String] },
    additives: { type: [String] }
  },
  nutrition: {
    calories: { type: Number },
    protein: { type: Number },
    carbohydrates: { type: Number },
    sugar: { type: Number },
    fat: { type: Number },
    saturatedFat: { type: Number },
    fiber: { type: Number },
    sodium: { type: Number }
  },
  processing: {
    level: { type: String },
    novaGroup: { type: Number },
    labels: { type: [String] }
  },
  source: {
    source: { type: String, default: 'OpenFoodFacts', index: true },
    sourceId: { type: String, index: true },
    lastUpdated: { type: Date, default: Date.now }
  },
  dataQuality: {
    completeness: { type: Number, default: 0 },
    missingNutritionFields: { type: [String] },
    dataQualityScore: { type: Number, default: 0 }
  },
  embedding: {
    vector: { type: [Number] },
    model: { type: String },
    dimensions: { type: Number },
    version: { type: String },
    textHash: { type: String },
    generatedAt: { type: Date }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
