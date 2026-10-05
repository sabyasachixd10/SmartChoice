import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, ImageIcon, Info, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { queryRag } from '../services/ragService';
import { useComparison } from '../context/ComparisonContext';

const EXAMPLE_QUESTIONS = [
  "Which product has the most fiber?",
  "Which product has the highest SmartChoice Score?",
  "Find a high-fiber snack",
  "Why was this product recommended?"
];

export const RagAssistantPage = () => {
  const [conversation, setConversation] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { addProduct, hasProduct } = useComparison();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation, isLoading]);

  const handleSubmit = async (e, overrideQuery = null) => {
    if (e) e.preventDefault();
    const submitQuery = overrideQuery || query;
    if (!submitQuery.trim() || isLoading) return;

    const userMessage = { role: 'user', content: submitQuery.trim() };
    setConversation(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const data = await queryRag(submitQuery.trim());
      
      const aiMessage = {
        role: 'ai',
        content: data.answer,
        retrieval: data.retrieval,
        products: data.products
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {products.map((product) => (
          <div 
            key={product._id} 
            className="border rounded-lg overflow-hidden shadow-sm bg-white flex flex-col hover:border-green-400 transition-colors"
          >
            <div 
              className="h-32 bg-gray-100 flex items-center justify-center p-4 cursor-pointer relative"
              onClick={() => navigate(`/product/${product._id}`)}
            >
              {product.calculated?.smartChoice && (
                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                  SC: {product.calculated.smartChoice.score}
                </div>
              )}
              {product.retrievalMetadata && (
                <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                  {Math.round(product.retrievalMetadata.score * 100)}% ({product.retrievalMetadata.classification})
                </div>
              )}
              {product.media?.imageUrl ? (
                <img src={product.media.imageUrl} alt={product.identity?.name} className="max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <div className="p-3 flex-grow flex flex-col">
              <h3 
                className="font-bold text-sm leading-tight mb-1 cursor-pointer hover:text-green-600 line-clamp-2"
                onClick={() => navigate(`/product/${product._id}`)}
              >
                {product.identity?.name || 'Unknown'}
              </h3>
              <p className="text-gray-500 text-xs mb-2 truncate">{product.identity?.brand || 'Unknown Brand'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-5xl mx-auto border rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="bg-green-700 text-white p-4 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="w-6 h-6" />
          <h1 className="text-xl font-bold">SmartChoice AI Assistant</h1>
        </div>
        <div className="text-sm text-green-100 flex items-center mt-2 sm:mt-0">
          <ShieldCheck className="w-4 h-4 mr-1" />
          Answers grounded in SmartChoice product data
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-gray-50">
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <Bot className="w-16 h-16 text-green-300" />
            <h2 className="text-2xl font-semibold text-gray-700">How can I help you?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {EXAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(null, q)}
                  className="bg-white border text-left p-3 rounded-lg text-gray-600 hover:border-green-500 hover:text-green-700 transition shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${msg.role === 'user' ? 'bg-blue-600 ml-3' : msg.role === 'error' ? 'bg-red-500 mr-3' : 'bg-green-600 mr-3'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : msg.role === 'error' ? <AlertCircle className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className="flex flex-col">
                <div className={`p-4 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : msg.role === 'error' ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none' : 'bg-white border rounded-tl-none text-gray-800'}`}>
                  {msg.role === 'error' ? (
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                      <p>{msg.content}</p>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                
                {msg.role === 'ai' && msg.retrieval && (
                  <div className="mt-2 pl-1">
                    {!msg.retrieval.hasSufficientEvidence ? (
                      <div className="inline-flex items-center text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Insufficient relevant products found.
                      </div>
                    ) : (
                      <div className="inline-flex items-center text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
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
          <div className="flex justify-start">
            <div className="flex flex-row max-w-[80%]">
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-green-600 mr-3">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white border p-4 rounded-2xl shadow-sm rounded-tl-none flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSubmit} className="flex relative">
          <input
            type="text"
            className="w-full pl-4 pr-12 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
            placeholder="Ask about products, nutrition, or comparisons..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="absolute right-2 top-1.5 p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default RagAssistantPage;
