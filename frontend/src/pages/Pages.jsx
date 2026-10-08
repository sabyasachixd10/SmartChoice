import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Image as ImageIcon, Plus, Trash2, GitCompare, ChevronRight, Activity, CheckCircle, AlertCircle, Info, Settings, Bot, ScanLine, Loader2 } from 'lucide-react';
import { searchProducts, getProductById, getProductScore, getRecommendations } from '../services/productService';
import { getSimilarProducts, compareProducts } from '../services/comparisonService';
import { useComparison } from '../context/ComparisonContext';
import { usePreferences } from '../context/PreferenceContext';
import { searchSemanticProducts } from '../services/semanticSearchService';
import RecommendationList from '../components/RecommendationList';
import axios from 'axios';
import RagAssistantPage from './RagAssistantPage';

const PlaceholderPage = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm border p-8">
    <h1 className="text-2xl font-bold mb-4">{title}</h1>
    <p className="text-gray-600">This page is under construction.</p>
  </div>
);

export const Home = () => (
  <div className="flex flex-col items-center justify-center py-20 lg:py-32">
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-semibold mb-8 animate-in">
      <Activity className="w-4 h-4" />
      <span>Smarter decisions for a healthier you</span>
    </div>
    <h1 className="text-5xl lg:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-700 via-emerald-600 to-teal-800 mb-6 text-center tracking-tight animate-in" style={{ animationDelay: '100ms' }}>
      Product Intelligence,<br />Simplified.
    </h1>
    <p className="text-lg lg:text-xl text-gray-600 mb-12 max-w-2xl text-center animate-in" style={{ animationDelay: '200ms' }}>
      Compare products, set dietary preferences, and discover personalized recommendations based on factual nutritional data.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in" style={{ animationDelay: '300ms' }}>
      <Link to="/search" className="flex items-center justify-center px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all hover:shadow-lg hover:shadow-green-200 transform hover:-translate-y-0.5">
        <SearchIcon className="w-5 h-5 mr-2" /> Search Products
      </Link>
      <Link to="/scanner" className="flex items-center justify-center px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5">
        <ScanLine className="w-5 h-5 mr-2 text-green-600" /> Scan Barcode
      </Link>
    </div>
    
    <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl animate-in" style={{ animationDelay: '400ms' }}>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm card-hover flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Bot className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold mb-2">AI Assistant</h3>
        <p className="text-gray-500 text-sm">Ask natural language questions and get grounded answers instantly.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm card-hover flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
          <Settings className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold mb-2">Personalization</h3>
        <p className="text-gray-500 text-sm">Tailor your experience with strict exclusions and dietary lifestyles.</p>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm card-hover flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
          <GitCompare className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold mb-2">Smart Comparisons</h3>
        <p className="text-gray-500 text-sm">Compare nutrition, ingredients, and processing side-by-side.</p>
      </div>
    </div>
  </div>
);

export const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('standard'); // 'standard' or 'semantic'
  const navigate = useNavigate();
  const { addProduct, hasProduct } = useComparison();
  const { preferences } = usePreferences();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let response;
      if (searchMode === 'semantic') {
        response = await searchSemanticProducts(query);
      } else {
        response = await searchProducts(query);
      }
      
      if (response.success) {
        // Semantic search returns { product, semanticScore }, standard returns array of products
        // Let's normalize it to an array of products, optionally with a semanticScore attached
        const products = searchMode === 'semantic' ? response.data.map(item => ({...item.product, semanticScore: item.semanticScore})) : response.data;

        if (products.length > 0) {
          try {
            const ids = products.map(p => p._id);
            const recRes = await getRecommendations(ids, preferences);
            if (recRes.success) {
              // Create a map of rankings
              const rankMap = {};
              recRes.data.forEach((r, idx) => {
                rankMap[r.productId] = r;
              });
              
              // We can sort results by finalScore
              products.sort((a, b) => {
                const sA = rankMap[a._id]?.finalScore || 0;
                const sB = rankMap[b._id]?.finalScore || 0;
                return sB - sA;
              });
              
              // Attach rec to product for display
              products.forEach(p => p.recommendation = rankMap[p._id]);
            }
          } catch (e) {
            console.error("Failed to rank search results", e);
          }
        }
        setResults(products);
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">Discover Products</h1>
          <p className="text-gray-500">Find and compare products tailored to your needs.</p>
        </div>
        <Link to="/preferences" className="text-sm font-medium text-green-600 flex items-center hover:text-green-800 transition-colors bg-green-50 px-4 py-2 rounded-full">
          <Settings className="w-4 h-4 mr-2"/> Personalize
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-6 mb-6 items-center bg-gray-50 p-1.5 rounded-xl self-start inline-flex">
          <button 
            type="button"
            onClick={() => setSearchMode('standard')} 
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${searchMode === 'standard' ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Standard Search
          </button>
          <button 
            type="button"
            onClick={() => setSearchMode('semantic')} 
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center ${searchMode === 'semantic' ? 'bg-white text-indigo-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Bot className="w-4 h-4 mr-2"/> AI Semantic Search
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder={searchMode === 'semantic' ? "Describe what you want (e.g., healthy vegan snack with high protein)" : "Search by name or brand (e.g., potato chips)"} 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-gray-900 text-lg"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:bg-green-300 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Searching</>
            ) : (
              'Search'
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center animate-in">
          <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && results.length === 0 && query && (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm animate-in">
          <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500">Try adjusting your search terms or use semantic search.</p>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-2xl overflow-hidden bg-white shadow-sm h-80 animate-pulse">
              <div className="h-48 bg-gray-100"></div>
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="pt-4 mt-auto"><div className="h-3 bg-gray-200 rounded w-1/4"></div></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in">
          {results.map((product) => (
            <div 
              key={product._id} 
              className="group border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:border-green-200 transform hover:-translate-y-1 relative"
            >
              <div 
                className="h-48 bg-white flex items-center justify-center p-6 cursor-pointer relative border-b border-gray-50"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                {product.recommendation && (
                  <div className="absolute top-3 right-3 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center z-10">
                    <Activity className="w-3 h-3 mr-1" /> Match: {product.recommendation.finalScore}
                  </div>
                )}
                {product.semanticScore !== undefined && (
                  <div className="absolute top-3 left-3 bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm z-10">
                    {Math.round(product.semanticScore * 100)}% Match
                  </div>
                )}
                {product.media?.imageUrl ? (
                  <img src={product.media.imageUrl} alt={product.identity?.name} className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-200" />
                )}
              </div>
              <div className="p-5 flex-grow flex flex-col bg-white">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1 truncate">{product.identity?.brand || 'Unknown Brand'}</p>
                <h3 
                  className="font-bold text-gray-900 text-lg leading-tight mb-2 cursor-pointer group-hover:text-green-600 transition-colors line-clamp-2"
                  onClick={() => navigate(`/product/${product._id}`)}
                >
                  {product.identity?.name || 'Unknown'}
                </h3>
                
                <div className="mt-auto pt-4 flex justify-between items-center border-t border-gray-50">
                  <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">
                    {product.serving?.servingSize ? product.serving.servingSize : 'Size N/A'}
                  </span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); addProduct(product); }}
                    disabled={hasProduct(product._id)}
                    className={`flex items-center text-sm font-semibold transition-colors ${
                      hasProduct(product._id) 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-green-600 hover:text-green-800 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100'
                    }`}
                  >
                    {hasProduct(product._id) ? <CheckCircle className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />} 
                    {hasProduct(product._id) ? 'Added' : 'Compare'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [scoreData, setScoreData] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { addProduct, hasProduct } = useComparison();
  const { preferences } = usePreferences();

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const prodRes = await getProductById(id);
        if (prodRes.success) {
          setProduct(prodRes.data);
          
          // Fetch similar, score, and personalization concurrently
          Promise.allSettled([
            getSimilarProducts(id),
            getProductScore(id),
            getRecommendations([id], preferences)
          ]).then((results) => {
            const simRes = results[0];
            const scRes = results[1];
            const recRes = results[2];
            
            if (simRes.status === 'fulfilled' && simRes.value.success) {
              setSimilar(simRes.value.data.similarProducts || []);
            }
            if (scRes.status === 'fulfilled' && scRes.value.success) {
              setScoreData(scRes.value.data);
            }
            if (recRes.status === 'fulfilled' && recRes.value.success && recRes.value.data.length > 0) {
              setRecommendation(recRes.value.data[0]);
            }
          });
        } else {
          setError(prodRes.message);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error fetching product details');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [id, preferences]);

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden h-96"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="h-48 bg-white rounded-2xl shadow-sm border"></div>
        <div className="h-48 bg-white rounded-2xl shadow-sm border"></div>
      </div>
    </div>
  );
  if (error) return (
    <div className="p-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl max-w-4xl mx-auto flex items-center shadow-sm">
      <AlertCircle className="w-6 h-6 mr-4 shrink-0" />
      <div>
        <h3 className="font-bold text-lg mb-1">Error Loading Product</h3>
        <p>{error}</p>
      </div>
    </div>
  );
  if (!product) return (
    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border max-w-4xl mx-auto">
      <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
      <p className="text-gray-500">The product you are looking for does not exist or has been removed.</p>
    </div>
  );

  const getValue = (val, unit = '') => val !== null && val !== undefined ? `${val}${unit}` : 'Not available';

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
    if (score >= 50) return 'bg-gradient-to-r from-amber-400 to-amber-600';
    return 'bg-gradient-to-r from-rose-400 to-rose-600';
  };

  return (
    <div className="space-y-10 animate-in pb-12">
      {/* Product Details Block */}
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-md shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="md:flex">
          <div className="md:w-[40%] bg-white p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white z-0"></div>
            <div className="relative z-10 w-full h-full min-h-[300px] flex items-center justify-center">
              {product.media?.imageUrl ? (
                <img src={product.media.imageUrl} alt={product.identity?.name} className="max-w-full max-h-96 object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="flex flex-col items-center text-gray-300">
                  <ImageIcon className="w-24 h-24 mb-4" />
                  <span className="font-medium">No image available</span>
                </div>
              )}
            </div>
          </div>
          <div className="md:w-[60%] p-8 lg:p-12 flex flex-col bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm font-bold tracking-widest text-green-600 uppercase mb-2">{product.identity?.brand || 'Unknown Brand'}</p>
                <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">{product.identity?.name || 'Unknown Product'}</h1>
                <div className="flex gap-2 flex-wrap">
                  {product.identity?.categories?.slice(0, 3).map((cat, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{cat}</span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => addProduct(product)}
                disabled={hasProduct(product._id)}
                className={`px-5 py-2.5 rounded-xl font-bold flex items-center shrink-0 transition-all ${
                  hasProduct(product._id) 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:shadow-sm'
                }`}
              >
                {hasProduct(product._id) ? <CheckCircle className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                {hasProduct(product._id) ? 'Added' : 'Compare'}
              </button>
            </div>

            {/* SmartChoice Score Block */}
            {scoreData && (
              <div className={`mt-4 border rounded-2xl p-6 shadow-sm ${getScoreColor(scoreData.totalScore)}`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center">
                    <div className="p-2 bg-white/50 rounded-lg mr-3 shadow-sm"><Activity className="w-6 h-6" /></div>
                    <h2 className="text-lg font-bold uppercase tracking-wider">SmartChoice Score</h2>
                  </div>
                  <div className="text-right flex items-baseline">
                    <span className="text-5xl font-black tracking-tight">{scoreData.totalScore}</span>
                    <span className="text-xl opacity-60 font-bold ml-1">/100</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="w-full bg-white/40 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                    <div className={`h-3 rounded-full shadow-sm ${getProgressColor(scoreData.totalScore)}`} style={{ width: `${scoreData.totalScore}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs font-bold opacity-75 uppercase tracking-wide">
                    <span>{scoreData.confidence.level} Confidence</span>
                    <span>Based on available data</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                  <div>
                    <h4 className="font-bold text-sm mb-3 opacity-90 border-b border-current pb-2 uppercase tracking-wide">Score Breakdown</h4>
                    <ul className="space-y-2 text-sm font-medium">
                      <li className="flex justify-between items-center"><span className="opacity-80">Nutrition</span> <span className="bg-white/50 px-2 py-0.5 rounded shadow-sm">{scoreData.breakdown.nutrition}</span></li>
                      <li className="flex justify-between items-center"><span className="opacity-80">Ingredients</span> <span className="bg-white/50 px-2 py-0.5 rounded shadow-sm">{scoreData.breakdown.ingredients}</span></li>
                      <li className="flex justify-between items-center"><span className="opacity-80">Processing</span> <span className="bg-white/50 px-2 py-0.5 rounded shadow-sm">{scoreData.breakdown.processing}</span></li>
                      <li className="flex justify-between items-center"><span className="opacity-80">Protein/Fiber</span> <span className="bg-white/50 px-2 py-0.5 rounded shadow-sm">{scoreData.breakdown.proteinFiber}</span></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-3 opacity-90 border-b border-current pb-2 uppercase tracking-wide">Key Factors</h4>
                    <ul className="space-y-2 text-xs font-medium">
                      {scoreData.positiveFactors.slice(0,2).map((f, i) => <li key={`p${i}`} className="flex items-start"><CheckCircle className="w-4 h-4 mr-2 mt-0 shrink-0 opacity-90" /> {f}</li>)}
                      {scoreData.negativeFactors.slice(0,2).map((f, i) => <li key={`n${i}`} className="flex items-start"><AlertCircle className="w-4 h-4 mr-2 mt-0 shrink-0 opacity-90" /> {f}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Match Block */}
            {recommendation && <div className="mt-6"><RecommendationList recommendation={recommendation} /></div>}
          </div>
        </div>
        
        {/* Deep Dive Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-gray-100 bg-gray-50/50">
          <div className="p-8 lg:p-12 md:border-r border-gray-100">
            <h3 className="font-extrabold text-xl mb-6 text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mr-3"><Activity className="w-4 h-4"/></div>
              Nutrition <span className="text-gray-400 font-medium ml-2 text-sm">(per 100{product.serving?.servingSizeUnit || 'g'})</span>
            </h3>
            <ul className="space-y-4 text-sm font-medium">
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Calories:</span> <span className="font-bold text-gray-900 text-base">{getValue(product.nutrition?.calories, ' kcal')}</span></li>
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Protein:</span> <span className="font-bold text-gray-900">{getValue(product.nutrition?.protein, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Carbohydrates:</span> <span className="font-bold text-gray-900">{getValue(product.nutrition?.carbohydrates, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 ml-4"><span className="text-gray-500 text-xs uppercase">Sugars:</span> <span className="font-bold text-gray-700">{getValue(product.nutrition?.sugar, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Fat:</span> <span className="font-bold text-gray-900">{getValue(product.nutrition?.fat, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 ml-4"><span className="text-gray-500 text-xs uppercase">Saturated Fat:</span> <span className="font-bold text-gray-700">{getValue(product.nutrition?.saturatedFat, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Fiber:</span> <span className="font-bold text-gray-900">{getValue(product.nutrition?.fiber, 'g')}</span></li>
              <li className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm border border-gray-100"><span className="text-gray-600">Sodium:</span> <span className="font-bold text-gray-900">{getValue(product.nutrition?.sodium, 'mg')}</span></li>
            </ul>
          </div>
          
          <div className="p-8 lg:p-12">
            <h3 className="font-extrabold text-xl mb-6 text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center mr-3"><Info className="w-4 h-4"/></div>
              Product Details
            </h3>
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Serving Size</span>
                <p className="font-semibold text-gray-900 text-lg">{product.serving?.servingSize || 'Not available'}</p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Ingredients</span>
                <p className="text-gray-700 text-sm leading-relaxed max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {product.ingredients?.ingredients?.length > 0 ? product.ingredients.ingredients.join(', ') : 'Not available'}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">Allergens</span>
                  <p className="font-semibold text-red-600">{product.ingredients?.allergens?.length > 0 ? product.ingredients.allergens.join(', ') : 'None listed'}</p>
                </div>
                <div className="flex-1 border-l pl-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2">NOVA Processing</span>
                  <p className="font-semibold text-gray-900">{product.processing?.level || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Products Block */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Similar Products</h2>
        {similar.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">No similar products found in database yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {similar.map((sim) => (
              <div key={sim.product._id} className="border rounded-lg bg-white shadow-sm flex flex-col overflow-hidden">
                <div className="flex p-4">
                  <div className="w-20 h-20 bg-gray-100 flex-shrink-0 flex items-center justify-center mr-4 rounded">
                    {sim.product.media?.imageUrl ? (
                      <img src={sim.product.media.imageUrl} alt={sim.product.identity?.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-bold text-md leading-tight">{sim.product.identity?.name || 'Unknown'}</h3>
                    <p className="text-xs text-gray-500 mb-2">{sim.product.identity?.brand}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-bold">
                        {sim.similarityScore}% Similar
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="px-4 pb-3">
                  <ul className="text-xs text-gray-600 space-y-1">
                    {sim.reasons.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-auto border-t flex">
                  <button 
                    onClick={() => {
                      navigate(`/product/${sim.product._id}`);
                      window.scrollTo(0, 0);
                    }}
                    className="flex-1 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border-r flex items-center justify-center"
                  >
                    View <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                  <button 
                    onClick={() => addProduct(sim.product)}
                    disabled={hasProduct(sim.product._id)}
                    className="flex-1 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:text-gray-400 disabled:hover:bg-transparent flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Compare
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const Compare = () => {
  const { compareList, removeProduct, clearProducts } = useComparison();
  const { preferences } = usePreferences();
  const [compData, setCompData] = useState(null);
  const [recommendations, setRecommendations] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (compareList.length < 2) return;
    
    const fetchComparison = async () => {
      setLoading(true);
      setError(null);
      try {
        const ids = compareList.map(p => p._id);
        const res = await compareProducts(ids);
        
        // Fetch recommendations (which includes SmartChoice score and Personalized score)
        let recMap = {};
        try {
          const recRes = await getRecommendations(ids, preferences);
          if (recRes.success) {
            recRes.data.forEach(r => {
              recMap[r.productId] = r;
            });
          }
        } catch (recErr) {
          console.error("Failed to load recommendations:", recErr);
        }

        if (res.success) {
          setCompData(res.data);
          setRecommendations(recMap);
        } else {
          setError(res.message);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error comparing products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchComparison();
  }, [compareList, preferences]);

  if (compareList.length < 2) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 px-4 animate-in">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <GitCompare className="w-12 h-12 text-gray-400" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Compare Products</h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">Select at least 2 products to see a detailed, side-by-side comparison of nutrition, ingredients, and scores.</p>
        <Link to="/search" className="inline-flex px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-sm hover:shadow-md transition-all">
          <SearchIcon className="w-5 h-5 mr-2" /> Find Products to Compare
        </Link>
        
        {compareList.length === 1 && (
          <div className="mt-12 p-6 bg-white border border-gray-200 shadow-sm rounded-2xl max-w-md mx-auto flex items-center justify-between text-left">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-50 border rounded-lg flex items-center justify-center mr-4">
                {compareList[0].media?.imageUrl ? (
                  <img src={compareList[0].media.imageUrl} className="max-h-full object-contain" alt="" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Currently Selected</p>
                <p className="font-bold text-gray-900 line-clamp-1">{compareList[0].identity?.name}</p>
              </div>
            </div>
            <button onClick={() => removeProduct(compareList[0]._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Find the highest personalized score
  let highestRecId = null;
  let highestRecScore = -1;
  Object.keys(recommendations).forEach(id => {
    if (recommendations[id].finalScore > highestRecScore && recommendations[id].isEligible) {
      highestRecScore = recommendations[id].finalScore;
      highestRecId = id;
    }
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Comparison</h1>
        <div className="flex items-center gap-4">
          <Link to="/preferences" className="text-sm text-indigo-600 hover:underline">Edit Preferences</Link>
          <button 
            onClick={clearProducts}
            className="text-red-600 hover:text-red-800 text-sm flex items-center font-medium"
          >
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8">Comparing products...</div>}
      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-6">{error}</div>}

      {!loading && !error && compData && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          
          {/* Header Row */}
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-4 bg-gray-50 flex flex-col justify-end">
              <span className="font-bold text-gray-500">Products</span>
            </div>
            {compData.products.map(p => (
              <div key={p._id} className="p-4 border-l flex flex-col items-center text-center bg-white relative">
                <button 
                  onClick={() => removeProduct(p._id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="h-24 w-full flex items-center justify-center mb-2">
                  {p.media?.imageUrl ? (
                    <img src={p.media.imageUrl} className="max-h-full object-contain" alt={p.identity?.name} />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <h3 className="font-bold text-sm leading-tight">{p.identity?.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{p.serving?.servingSize || 'N/A'}</p>
                
                {recommendations[p._id] && (
                  <div className={`mt-auto w-full p-2 rounded border ${highestRecId === p._id ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                      <span>Base</span>
                      <span>Prefs</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">{recommendations[p._id].smartChoiceScore}</span>
                      <span className="text-sm font-semibold text-indigo-600">{recommendations[p._id].personalization.score}</span>
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-wider mt-2 border-t pt-1 ${highestRecId === p._id ? 'text-indigo-800' : 'text-gray-600'}`}>
                      Match
                    </div>
                    <div className={`text-2xl font-black ${highestRecId === p._id ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {recommendations[p._id].finalScore}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {highestRecId && (
             <div className="p-4 bg-indigo-50 text-indigo-800 text-sm text-center border-b font-medium">
               {compData.products.find(p => p._id === highestRecId)?.identity?.name} is the best match for your current preferences based on the available data.
             </div>
          )}

          {/* Key Differences Highlight (Only for 2 products) */}
          {compData.products.length === 2 && compData.keyDifferences?.length > 0 && (
            <div className="p-6 bg-blue-50 border-b">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center"><GitCompare className="w-5 h-5 mr-2" /> Key Factual Differences (per 100g)</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                {compData.keyDifferences.map((diff, i) => (
                  <li key={i}>• {diff.statement}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Nutrition Section */}
          <div className="bg-gray-50 p-3 font-bold border-b text-gray-700">Nutrition (per 100g/ml)</div>
          {Object.entries(compData.nutritionComparison).map(([key, data]) => (
            <div key={key} className="grid border-b hover:bg-gray-50" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
              <div className="p-3 font-medium text-sm text-gray-700 flex items-center">{data.name}</div>
              {data.values.map((val, i) => (
                <div key={i} className="p-3 border-l text-center text-sm">
                  {val !== null ? `${val}${data.unit}` : <span className="text-gray-400">-</span>}
                </div>
              ))}
            </div>
          ))}

          {/* Ingredients Section */}
          <div className="bg-gray-50 p-3 font-bold border-b text-gray-700 border-t-4">Ingredients</div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">Count</div>
            {compData.ingredientComparison.counts.map((count, i) => (
              <div key={i} className="p-3 border-l text-center text-sm">{count}</div>
            ))}
          </div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">Unique</div>
            {compData.ingredientComparison.unique.map((list, i) => (
              <div key={i} className="p-3 border-l text-xs text-gray-600">
                {list.length > 0 ? list.join(', ') : <span className="text-gray-400">None</span>}
              </div>
            ))}
          </div>

          {/* Additives Section */}
          <div className="bg-gray-50 p-3 font-bold border-b text-gray-700 border-t-4">Additives</div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">Count</div>
            {compData.additiveComparison.counts.map((count, i) => (
              <div key={i} className="p-3 border-l text-center text-sm">{count}</div>
            ))}
          </div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">Unique</div>
            {compData.additiveComparison.unique.map((list, i) => (
              <div key={i} className="p-3 border-l text-xs text-gray-600 uppercase">
                {list.length > 0 ? list.join(', ') : <span className="text-gray-400">None</span>}
              </div>
            ))}
          </div>

          {/* Allergens Section */}
          <div className="bg-gray-50 p-3 font-bold border-b text-gray-700 border-t-4">Allergens</div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">Listed</div>
            {compData.products.map((p, i) => (
              <div key={i} className="p-3 border-l text-xs text-red-600 text-center flex items-center justify-center">
                {p.ingredients?.allergens?.length > 0 ? p.ingredients.allergens.join(', ') : <span className="text-gray-400">Allergen info unavailable/none</span>}
              </div>
            ))}
          </div>

          {/* Processing Section */}
          <div className="bg-gray-50 p-3 font-bold border-b text-gray-700 border-t-4">Processing</div>
          <div className="grid border-b" style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${compData.products.length}, 1fr)` }}>
            <div className="p-3 font-medium text-sm text-gray-700">NOVA Group</div>
            {compData.processingComparison.map((proc, i) => (
              <div key={i} className="p-3 border-l text-center text-sm">
                {proc.novaGroup ? `NOVA ${proc.novaGroup}` : <span className="text-gray-400">-</span>}
              </div>
            ))}
          </div>

        </div>
      )}
    </div>
  );
};

export { default as Scanner } from './BarcodeScannerPage';
export { default as OCR } from './OcrPage';
export const Recommendations = () => <PlaceholderPage title="Recommendations" />;
export const Dashboard = () => <PlaceholderPage title="User Dashboard" />;
export const History = () => <PlaceholderPage title="Search History" />;
export const Profile = () => <PlaceholderPage title="User Profile" />;
export const Login = () => <PlaceholderPage title="Login" />;
export const Register = () => <PlaceholderPage title="Register" />;
export const About = () => <PlaceholderPage title="About SmartChoice" />;
export { RagAssistantPage };
