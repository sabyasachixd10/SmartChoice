import React, { useState, useEffect } from 'react';
import { usePreferences } from '../context/PreferenceContext';
import { Settings, Save, CheckCircle } from 'lucide-react';

const PreferencesPage = () => {
  const { preferences, updatePreferences, loading } = usePreferences();
  const [formData, setFormData] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading) {
      setFormData(preferences);
    }
  }, [preferences, loading]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setSaved(false);
  };

  const handleArrayChange = (e, field) => {
    const val = e.target.value;
    const arr = val.split(',').map(s => s.trim()).filter(s => s);
    setFormData(prev => ({
      ...prev,
      [field]: arr
    }));
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updatePreferences(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <div className="text-center py-12">Loading preferences...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center mb-6">
        <Settings className="w-8 h-8 text-green-600 mr-3" />
        <h1 className="text-3xl font-bold">Your Preferences</h1>
      </div>
      
      <p className="text-gray-600 mb-8">
        Set your dietary preferences below. The SmartChoice recommendation engine will use these to personalize product rankings when you search and compare products.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-sm border">
        
        {/* Soft Preferences */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Nutritional Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="highProtein" checked={formData.highProtein || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">High Protein</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="lowSugar" checked={formData.lowSugar || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Low Sugar</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="lowCalories" checked={formData.lowCalories || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Low Calories</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="lowSaturatedFat" checked={formData.lowSaturatedFat || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Low Saturated Fat</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="lowSodium" checked={formData.lowSodium || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Low Sodium</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="highFiber" checked={formData.highFiber || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">High Fiber</span>
            </label>
          </div>
        </section>

        {/* Dietary Lifestyles */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Dietary Lifestyles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="vegetarian" checked={formData.vegetarian || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Vegetarian</span>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" name="vegan" checked={formData.vegan || false} onChange={handleChange} className="w-5 h-5 text-green-600" />
              <span className="font-medium">Vegan</span>
            </label>
          </div>
        </section>

        {/* Hard Constraints */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2 text-red-600">Strict Exclusions (Hard Constraints)</h2>
          <p className="text-sm text-gray-500 mb-4">Products matching these will be excluded from recommendations.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avoid Allergens (comma separated)</label>
              <input 
                type="text" 
                placeholder="e.g. gluten, peanuts, milk" 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
                value={(formData.avoidAllergens || []).join(', ')}
                onChange={(e) => handleArrayChange(e, 'avoidAllergens')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avoid Ingredients (comma separated)</label>
              <input 
                type="text" 
                placeholder="e.g. palm oil, aspartame" 
                className="w-full p-2 border rounded focus:ring-red-500 focus:border-red-500"
                value={(formData.avoidIngredients || []).join(', ')}
                onChange={(e) => handleArrayChange(e, 'avoidIngredients')}
              />
            </div>
          </div>
        </section>
        
        {/* Brands */}
        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Brands</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Brands (comma separated)</label>
              <input 
                type="text" 
                placeholder="e.g. Pringles, Coca-Cola" 
                className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                value={(formData.preferredBrands || []).join(', ')}
                onChange={(e) => handleArrayChange(e, 'preferredBrands')}
              />
            </div>
          </div>
        </section>

        <div className="pt-4 flex items-center justify-end">
          {saved && (
            <span className="text-green-600 flex items-center mr-4">
              <CheckCircle className="w-5 h-5 mr-1" />
              Preferences Saved
            </span>
          )}
          <button 
            type="submit" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-bold"
          >
            <Save className="w-5 h-5 mr-2" />
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesPage;
