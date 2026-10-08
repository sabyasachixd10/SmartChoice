import React, { useState, useEffect } from 'react';
import { usePreferences } from '../context/PreferenceContext';
import { Settings, Save, CheckCircle, Sliders, AlertTriangle, ShieldCheck, HeartPulse } from 'lucide-react';

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

  if (loading) return (
    <div className="max-w-4xl mx-auto p-8 animate-pulse">
      <div className="h-12 w-64 bg-gray-200 rounded-lg mb-12"></div>
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 rounded-2xl"></div>
        <div className="h-48 bg-gray-100 rounded-2xl"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-xl mb-4 shadow-sm">
            <Sliders className="w-6 h-6" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Personalization</h1>
          <p className="text-lg text-gray-500 max-w-2xl">
            Tailor your SmartChoice experience. Your preferences power our AI recommendations and scoring algorithms.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Nutritional Goals */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <HeartPulse className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2 flex items-center text-gray-900">
              Nutritional Goals
            </h2>
            <p className="text-gray-500 mb-6 text-sm">Select the nutritional targets you want to prioritize.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'highProtein', label: 'High Protein', desc: 'Prioritize protein content' },
                { name: 'lowSugar', label: 'Low Sugar', desc: 'Minimize added sugars' },
                { name: 'lowCalories', label: 'Low Calories', desc: 'Focus on low-calorie options' },
                { name: 'lowSaturatedFat', label: 'Low Sat. Fat', desc: 'Heart-healthy choices' },
                { name: 'lowSodium', label: 'Low Sodium', desc: 'Reduce salt intake' },
                { name: 'highFiber', label: 'High Fiber', desc: 'Prioritize digestive health' },
              ].map((item) => (
                <label key={item.name} className={`flex items-start p-4 border rounded-2xl cursor-pointer transition-all duration-200 ${formData[item.name] ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}>
                  <div className="flex items-center h-5 mt-0.5">
                    <input 
                      type="checkbox" 
                      name={item.name} 
                      checked={formData[item.name] || false} 
                      onChange={handleChange} 
                      className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div className="ml-3">
                    <span className={`block text-sm font-bold ${formData[item.name] ? 'text-indigo-900' : 'text-gray-900'}`}>{item.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Dietary Lifestyles */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2 flex items-center text-gray-900">
                <ShieldCheck className="w-5 h-5 text-green-500 mr-2" /> Dietary Lifestyles
              </h2>
              <p className="text-gray-500 mb-6 text-sm">Align recommendations with your lifestyle.</p>
              
              <div className="space-y-4">
                {[
                  { name: 'vegetarian', label: 'Vegetarian', desc: 'No meat, poultry, or seafood' },
                  { name: 'vegan', label: 'Vegan', desc: 'No animal products or by-products' },
                ].map((item) => (
                  <label key={item.name} className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${formData[item.name] ? 'bg-green-50 border-green-200 ring-1 ring-green-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                    <div>
                      <span className={`block text-sm font-bold ${formData[item.name] ? 'text-green-900' : 'text-gray-900'}`}>{item.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>
                    </div>
                    <div className="flex items-center h-5">
                      <input 
                        type="checkbox" 
                        name={item.name} 
                        checked={formData[item.name] || false} 
                        onChange={handleChange} 
                        className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                      />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Hard Constraints */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 border-t-4 border-t-rose-500 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2 flex items-center text-gray-900">
                <AlertTriangle className="w-5 h-5 text-rose-500 mr-2" /> Strict Exclusions
              </h2>
              <p className="text-gray-500 mb-6 text-sm">Products matching these will be strictly excluded.</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Avoid Allergens</label>
                  <input 
                    type="text" 
                    placeholder="e.g. gluten, peanuts, milk" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-sm"
                    value={(formData.avoidAllergens || []).join(', ')}
                    onChange={(e) => handleArrayChange(e, 'avoidAllergens')}
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Comma separated</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Avoid Ingredients</label>
                  <input 
                    type="text" 
                    placeholder="e.g. palm oil, aspartame" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all text-sm"
                    value={(formData.avoidIngredients || []).join(', ')}
                    onChange={(e) => handleArrayChange(e, 'avoidIngredients')}
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Comma separated</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Brands */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-2 text-gray-900">Brand Preferences</h2>
          <p className="text-gray-500 mb-6 text-sm">Boost recommendations for your favorite brands.</p>
          <div className="max-w-2xl">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide text-xs">Preferred Brands</label>
            <input 
              type="text" 
              placeholder="e.g. Pringles, Coca-Cola" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
              value={(formData.preferredBrands || []).join(', ')}
              onChange={(e) => handleArrayChange(e, 'preferredBrands')}
            />
            <p className="text-[10px] text-gray-400 mt-1.5 ml-1">Comma separated list of brand names</p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between border-t border-gray-200">
          <div className="mb-4 sm:mb-0">
            {saved && (
              <span className="text-emerald-600 flex items-center bg-emerald-50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm border border-emerald-100 animate-in">
                <CheckCircle className="w-5 h-5 mr-2" />
                Preferences Successfully Saved
              </span>
            )}
          </div>
          <button 
            type="submit" 
            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center justify-center font-bold shadow-sm hover:shadow-md transition-all transform active:scale-95"
          >
            <Save className="w-5 h-5 mr-2" />
            Save Personalization
          </button>
        </div>
      </form>
    </div>
  );
};

export default PreferencesPage;
