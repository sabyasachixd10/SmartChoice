const mongoose = require('mongoose');

const UserPreferenceSchema = new mongoose.Schema({
  highProtein: { type: Boolean, default: false },
  lowSugar: { type: Boolean, default: false },
  lowCalories: { type: Boolean, default: false },
  lowSaturatedFat: { type: Boolean, default: false },
  lowSodium: { type: Boolean, default: false },
  highFiber: { type: Boolean, default: false },

  vegetarian: { type: Boolean, default: false },
  vegan: { type: Boolean, default: false },

  avoidAllergens: { type: [String], default: [] },
  avoidIngredients: { type: [String], default: [] },
  preferredCategories: { type: [String], default: [] },
  excludedCategories: { type: [String], default: [] },
  preferredBrands: { type: [String], default: [] },
  excludedBrands: { type: [String], default: [] },

  maxCalories: { type: Number, default: null },
  maxSugar: { type: Number, default: null },
  minProtein: { type: Number, default: null },
  minFiber: { type: Number, default: null }
}, {
  timestamps: true
});

module.exports = mongoose.model('UserPreference', UserPreferenceSchema);
