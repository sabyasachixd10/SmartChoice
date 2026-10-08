import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, ImageIcon, ShieldCheck, AlertTriangle, AlertCircle, Sparkles, Activity } from 'lucide-react';
import { queryRag } from '../services/ragService';
import { useComparison } from '../context/ComparisonContext';

const EXAMPLE_QUESTIONS = [
  "Which product has the most fiber?",
  "Compare the highest protein options",
  "Find a healthy vegan snack",
  "Why was this product recommended?"
];

export const RagAssistantPage = () => {
  const [conversation, setConversation] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const [sessionId, setSessionId] = useState('');
  const { compareList, addProduct, removeProduct, clearProducts } = useComparison();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, isLoading]);

  useEffect(() => {
    let sid = sessionStorage.getItem('smartchoice_rag_session');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem('smartchoice_rag_session', sid);
    }
    setSessionId(sid);
  }, []);

  const handleSubmit = async (e, overrideQuery = null) => {
    if (e) e.preventDefault();
    const submitQuery = overrideQuery || query;
    if (!submitQuery.trim() || isLoading) return;

    const userMessage = { role: 'user', content: submitQuery.trim() };
    setConversation(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const activeProductIds = compareList.map(p => p._id);

      const response = await queryRag(submitQuery.trim(), 5, sessionId, activeProductIds);
      const data = response.data;
      
      if (data.actions && Array.isArray(data.actions)) {
        data.actions.forEach(action => {
          if (action.type === 'ADD_PRODUCT') {
            const p = data.products?.find(prod => prod._id === action.payload.productId);
            if (p) addProduct(p);
          } else if (action.type === 'REMOVE_PRODUCT') {
            removeProduct(action.payload.productId);
          } else if (action.type === 'CLEAR_COMPARISON') {
            clearProducts();
          }
        });
      }

      const aiMessage = {
        role: 'ai',
        content: data.answer || "No response provided.",
        retrieval: {
          hasSufficientEvidence: data.sources && data.sources.length > 0,
          usableResults: data.products?.length || 0,
          sources: data.sources || []
        },
        products: data.products || []
      };
      setConversation(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'error',
        content: err.message || 'An unexpected error occurred.'
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProducts = (products) => {
    if (!products || products.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {products.map((product) => (
          <div 
            key={product._id} 
            className="group border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm flex hover:border-green-300 transition-all hover:shadow-md cursor-pointer"
            onClick={() => navigate(`/product/${product._id}`)}
          >
            <div className="w-24 h-24 bg-gray-50 flex items-center justify-center p-2 relative shrink-0 border-r border-gray-100">
              {product.media?.imageUrl ? (
                <img src={product.media.imageUrl} alt={product.identity?.name} className="max-h-full object-contain group-hover:scale-105 transition-transform" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-300" />
              )}
            </div>
            <div className="p-3 flex-grow flex flex-col justify-center">
              <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">
                {product.identity?.name || 'Unknown'}
              </h3>
              <p className="text-gray-500 text-xs mb-2 truncate uppercase tracking-wider font-semibold">{product.identity?.brand || 'Unknown Brand'}</p>
              
              <div className="flex gap-2">
                {product.calculated?.smartChoice && (
                  <div className="inline-flex items-center bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-100">
                    <Activity className="w-3 h-3 mr-1" /> {product.calculated.smartChoice.score}
                  </div>
                )}
                {product.retrievalMetadata && (
                  <div className="inline-flex items-center bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-100">
                    <Sparkles className="w-3 h-3 mr-1" /> {Math.round(product.retrievalMetadata.score * 100)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto border border-gray-200 rounded-2xl overflow-hidden bg-gray-50 shadow-sm animate-in">
      <div className="bg-white border-b p-4 flex flex-col sm:flex-row justify-between items-center z-10 shadow-sm relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">SmartChoice AI</h1>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-widest flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" /> Verified Data
            </p>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <Bot className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">How can I help you today?</h2>
              <p className="text-gray-500">Ask about specific products, nutrition comparisons, or dietary advice.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl w-full">
              {EXAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(null, q)}
                  className="bg-white border border-gray-200 p-4 rounded-xl text-sm font-medium text-gray-700 hover:border-green-400 hover:text-green-700 hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <span>{q}</span>
                  <Send className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in`} style={{animationDuration: '0.3s'}}>
            <div className={`flex max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${msg.role === 'user' ? 'bg-gray-800 ml-3' : msg.role === 'error' ? 'bg-red-100 mr-3' : 'bg-gradient-to-br from-green-500 to-emerald-600 mr-3'}`}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : msg.role === 'error' ? <AlertCircle className="w-5 h-5 text-red-600" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className="flex flex-col">
                <div className={`p-4 md:p-5 shadow-sm text-sm md:text-base leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-gray-800 text-white rounded-2xl rounded-tr-sm' 
                  : msg.role === 'error' 
                  ? 'bg-red-50 border border-red-100 text-red-800 rounded-2xl rounded-tl-sm' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                }`}>
                  {msg.role === 'error' ? (
                    <div className="flex items-start font-medium">
                      <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <p>{msg.content}</p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                
                {msg.role === 'ai' && msg.retrieval && (
                  <div className="mt-2 ml-1 flex items-center">
                    {!msg.retrieval.hasSufficientEvidence ? (
                      <div className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Insufficient relevant products found
                      </div>
                    ) : (
                      <div className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Grounded in {msg.retrieval.usableResults} product{msg.retrieval.usableResults !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                )}
                
                {msg.role === 'ai' && msg.products && renderProducts(msg.products)}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-in">
            <div className="flex flex-row max-w-[80%]">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mr-3 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl rounded-tl-sm shadow-sm flex space-x-2 items-center h-12">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 z-10">
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-3xl mx-auto w-full">
          <input
            type="text"
            className="w-full pl-5 pr-14 py-4 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-gray-900 shadow-sm"
            placeholder="Ask about products, nutrition, or comparisons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 p-3 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-sm flex items-center justify-center transform active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RagAssistantPage;
