import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Search as SearchIcon, Image as ImageIcon, Plus, Trash2, GitCompare, ChevronRight, Activity, CheckCircle, AlertCircle, Info, Settings } from 'lucide-react';
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
  <div className="flex flex-col items-center justify-center py-20">
    <h1 className="text-5xl font-bold text-green-700 mb-6">Make Smart Choices</h1>
    <p className="text-xl text-gray-600 mb-10 max-w-2xl text-center">
      Compare products, set your dietary preferences, and get personalized recommendations based on actual nutritional facts.
    </p>
    <div className="flex gap-4">
      <Link to="/search" className="px-8 py-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Search Products</Link>
      <Link to="/preferences" className="px-8 py-4 bg-white text-green-600 border-2 border-green-600 rounded-lg font-bold hover:bg-green-50">Set Preferences</Link>
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
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-bold">Search Products</h1>
        <Link to="/preferences" className="text-sm text-green-600 flex items-center hover:underline"><Settings className="w-4 h-4 mr-1"/> Customize Rankings</Link>
      </div>
      
      <div className="flex gap-4 mb-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input 
            type="radio" 
            name="searchMode" 
            value="standard" 
            checked={searchMode === 'standard'} 
            onChange={() => setSearchMode('standard')} 
            className="text-green-600 focus:ring-green-500"
          />
          <span>Standard Search</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input 
            type="radio" 
            name="searchMode" 
            value="semantic" 
            checked={searchMode === 'semantic'} 
            onChange={() => setSearchMode('semantic')} 
            className="text-green-600 focus:ring-green-500"
          />
          <span>Semantic Search (AI)</span>
        </label>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text" 
          placeholder="Search by name or brand (e.g., chips)" 
          className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center"
        >
          <SearchIcon className="w-5 h-5 mr-2" />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

      {!loading && !error && results.length === 0 && query && (
        <div className="p-8 text-center text-gray-500">No products found for "{query}".</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((product) => (
          <div 
            key={product._id} 
            className="border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col hover:border-green-400 transition-colors"
          >
            <div 
              className="h-48 bg-gray-100 flex items-center justify-center p-4 cursor-pointer relative"
              onClick={() => navigate(`/product/${product._id}`)}
            >
              {product.recommendation && (
                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                  Match: {product.recommendation.finalScore}
                </div>
              )}
              {product.semanticScore !== undefined && (
                <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                  Semantic: {Math.round(product.semanticScore * 100)}%
                </div>
              )}
              {product.media?.imageUrl ? (
                <img src={product.media.imageUrl} alt={product.identity?.name} className="max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <h3 
                className="font-bold text-lg leading-tight mb-1 cursor-pointer hover:text-green-600"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                {product.identity?.name || 'Unknown'}
              </h3>
              <p className="text-gray-600 text-sm mb-2">{product.identity?.brand || 'Unknown Brand'}</p>
              
              <div className="mt-auto pt-2 text-sm text-gray-500 flex justify-between items-center border-t">
                <span>{product.serving?.servingSize ? `Serving: ${product.serving.servingSize}` : 'Serving size NA'}</span>
                <button 
                  onClick={() => addProduct(product)}
                  disabled={hasProduct(product._id)}
                  className="flex items-center text-green-600 hover:text-green-800 disabled:text-gray-400"
                  title="Add to Compare"
                >
                  <Plus className="w-4 h-4 mr-1" /> Compare
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
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

  if (loading) return <div className="text-center py-12">Loading product...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg max-w-4xl mx-auto">{error}</div>;
  if (!product) return <div className="text-center py-12">Product not found.</div>;

  const getValue = (val, unit = '') => val !== null && val !== undefined ? `${val}${unit}` : 'Not available';

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      {/* Product Details Block */}
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="md:flex">
          <div className="md:w-1/3 bg-gray-50 p-8 flex items-center justify-center border-b md:border-b-0 md:border-r">
            {product.media?.imageUrl ? (
              <img src={product.media.imageUrl} alt={product.identity?.name} className="max-w-full max-h-80 object-contain" />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <ImageIcon className="w-16 h-16 mb-2" />
                <span>No image available</span>
              </div>
            )}
          </div>
          <div className="md:w-2/3 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.identity?.name || 'Unknown Product'}</h1>
                <p className="text-xl text-gray-600 mb-4">{product.identity?.brand || 'Unknown Brand'}</p>
                <div className="flex gap-2 flex-wrap">
                  {product.identity?.categories?.slice(0, 3).map((cat, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">{cat}</span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => addProduct(product)}
                disabled={hasProduct(product._id)}
                className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 flex items-center shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                {hasProduct(product._id) ? 'Added to Compare' : 'Add to Compare'}
              </button>
            </div>

            {/* SmartChoice Score Block */}
            {scoreData && (
              <div className={`border rounded-xl p-5 ${getScoreColor(scoreData.totalScore)}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Activity className="w-6 h-6 mr-2" />
                    <h2 className="text-xl font-bold tracking-tight">SMARTCHOICE SCORE</h2>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black">{scoreData.totalScore}</span>
                    <span className="text-lg opacity-70"> / 100</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-white/50 rounded-full h-2.5 mb-1 overflow-hidden">
                    <div className={`h-2.5 rounded-full ${getProgressColor(scoreData.totalScore)}`} style={{ width: `${scoreData.totalScore}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs opacity-80 font-medium">
                    <span>{scoreData.confidence.level === 'high' ? 'High' : scoreData.confidence.level === 'medium' ? 'Medium' : 'Low'} confidence</span>
                    <span>Based on available product data</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  <div>
                    <h4 className="font-bold text-sm mb-2 opacity-80 border-b border-current pb-1">Score Breakdown</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between"><span>Nutrition</span> <strong>{scoreData.breakdown.nutrition}</strong></li>
                      <li className="flex justify-between"><span>Ingredients</span> <strong>{scoreData.breakdown.ingredients}</strong></li>
                      <li className="flex justify-between"><span>Processing</span> <strong>{scoreData.breakdown.processing}</strong></li>
                      <li className="flex justify-between"><span>Protein & Fiber</span> <strong>{scoreData.breakdown.proteinFiber}</strong></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-2 opacity-80 border-b border-current pb-1">Why this score?</h4>
                    <ul className="space-y-1 text-xs">
                      {scoreData.positiveFactors.map((f, i) => <li key={i} className="flex items-start"><CheckCircle className="w-3 h-3 mr-1 mt-0.5 shrink-0" /> {f}</li>)}
                      {scoreData.negativeFactors.map((f, i) => <li key={i} className="flex items-start"><AlertCircle className="w-3 h-3 mr-1 mt-0.5 shrink-0" /> {f}</li>)}
                      {scoreData.limitations.map((f, i) => <li key={i} className="flex items-start opacity-70"><Info className="w-3 h-3 mr-1 mt-0.5 shrink-0" /> {f}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Recommendation Match Block */}
            {recommendation && <RecommendationList recommendation={recommendation} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div>
                <h3 className="font-bold text-lg border-b pb-2 mb-3">Nutrition (per 100{product.serving?.servingSizeUnit || 'g'})</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between"><span>Calories:</span> <span className="font-medium">{getValue(product.nutrition?.calories, ' kcal')}</span></li>
                  <li className="flex justify-between"><span>Protein:</span> <span className="font-medium">{getValue(product.nutrition?.protein, 'g')}</span></li>
                  <li className="flex justify-between"><span>Carbohydrates:</span> <span className="font-medium">{getValue(product.nutrition?.carbohydrates, 'g')}</span></li>
                  <li className="flex justify-between text-gray-600 pl-4"><span>Sugars:</span> <span>{getValue(product.nutrition?.sugar, 'g')}</span></li>
                  <li className="flex justify-between"><span>Fat:</span> <span className="font-medium">{getValue(product.nutrition?.fat, 'g')}</span></li>
                  <li className="flex justify-between text-gray-600 pl-4"><span>Saturated Fat:</span> <span>{getValue(product.nutrition?.saturatedFat, 'g')}</span></li>
                  <li className="flex justify-between"><span>Fiber:</span> <span className="font-medium">{getValue(product.nutrition?.fiber, 'g')}</span></li>
                  <li className="flex justify-between"><span>Sodium:</span> <span className="font-medium">{getValue(product.nutrition?.sodium, 'mg')}</span></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-bold text-lg border-b pb-2 mb-3">Details</h3>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-semibold block mb-1">Serving Size:</span>
                    <p>{product.serving?.servingSize || 'Not available'}</p>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Ingredients:</span>
                    <p className="text-gray-700 max-h-32 overflow-y-auto pr-2">
                      {product.ingredients?.ingredients?.length > 0 ? product.ingredients.ingredients.join(', ') : 'Not available'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Allergens:</span>
                    <p className="text-red-600">{product.ingredients?.allergens?.length > 0 ? product.ingredients.allergens.join(', ') : 'None listed'}</p>
                  </div>
                  <div>
                    <span className="font-semibold block mb-1">Processing (NOVA):</span>
                    <p>{product.processing?.level || 'Not available'}</p>
                  </div>
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
      <div className="max-w-4xl mx-auto text-center py-16 px-4">
        <GitCompare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h1 className="text-3xl font-bold mb-2">Compare Products</h1>
        <p className="text-gray-600 mb-8">Select at least 2 products to see a detailed comparison.</p>
        <Link to="/search" className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Find Products
        </Link>
        
        {compareList.length === 1 && (
          <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-lg max-w-md mx-auto flex items-center justify-between">
            <span className="font-medium">{compareList[0].identity?.name}</span>
            <button onClick={() => removeProduct(compareList[0]._id)} className="text-red-500 hover:text-red-700">
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

export const Scanner = () => <PlaceholderPage title="Barcode Scanner" />;
export const OCR = () => <PlaceholderPage title="OCR Scanner" />;
export const Recommendations = () => <PlaceholderPage title="Recommendations" />;
export const Dashboard = () => <PlaceholderPage title="User Dashboard" />;
export const History = () => <PlaceholderPage title="Search History" />;
export const Profile = () => <PlaceholderPage title="User Profile" />;
export const Login = () => <PlaceholderPage title="Login" />;
export const Register = () => <PlaceholderPage title="Register" />;
export const About = () => <PlaceholderPage title="About SmartChoice" />;
export { RagAssistantPage };
