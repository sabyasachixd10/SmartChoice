import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScanner from '../components/BarcodeScanner';
import { getProductByBarcode } from '../services/productService';
import { Search, AlertCircle, RefreshCw, ScanLine, ArrowRight } from 'lucide-react';

const BarcodeScannerPage = () => {
  const [detectedBarcode, setDetectedBarcode] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [status, setStatus] = useState('idle'); // idle, scanning, loading, not-found, error
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleBarcodeDetected = async (barcode) => {
    if (status === 'loading') return;
    setDetectedBarcode(barcode);
    setStatus('loading');
    
    try {
      const result = await getProductByBarcode(barcode);
      if (result && result.success && result.data && result.data._id) {
        navigate(`/product/${result.data._id}`);
      } else {
        setStatus('not-found');
      }
    } catch (err) {
      setStatus('not-found');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanBarcode = manualBarcode.trim();
    if (/^\d{6,14}$/.test(cleanBarcode)) {
      handleBarcodeDetected(cleanBarcode);
    } else {
      setStatus('error');
      setErrorMessage('Please enter a valid barcode number.');
    }
  };

  const resetScanner = () => {
    setDetectedBarcode('');
    setManualBarcode('');
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-700 rounded-2xl mb-4 shadow-inner">
          <ScanLine className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Scan Barcode</h1>
        <p className="text-xl text-gray-500 max-w-lg mx-auto">Point your camera at a product barcode to instantly view its SmartChoice score, nutrition facts, and personalized recommendations.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        
        <div className="p-1">
          {status === 'idle' && (
            <div className="relative overflow-hidden rounded-t-[22px] bg-black">
              <div className="absolute inset-0 border-4 border-black z-10 pointer-events-none"></div>
              <BarcodeScanner 
                onDetected={handleBarcodeDetected} 
                onError={(err) => {
                  // Scanner component handles its own error UI
                }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
                <div className="w-64 h-32 border-2 border-white/50 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
                  <div className="absolute top-1/2 w-full h-0.5 bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)] animate-scan"></div>
                </div>
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center p-20 text-center bg-gray-50 rounded-t-[22px]">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center absolute top-0 left-0 animate-ping opacity-75"></div>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center relative z-10">
                  <RefreshCw className="w-10 h-10 text-green-600 animate-spin" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Analyzing Product...</h2>
              <div className="mt-4 px-4 py-2 bg-white rounded-lg shadow-sm border text-sm font-mono text-gray-500">
                {detectedBarcode}
              </div>
            </div>
          )}

          {status === 'not-found' && (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-amber-50 rounded-t-[22px]">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
              <p className="text-gray-600 mb-6 max-w-sm">
                We couldn't find a product with barcode <span className="font-mono bg-white px-2 py-1 rounded border text-sm ml-1">{detectedBarcode}</span> in our database.
              </p>
              <button 
                onClick={resetScanner}
                className="px-8 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-sm transform active:scale-95"
              >
                Scan Another Item
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-rose-50 rounded-t-[22px]">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-rose-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-rose-600 mb-8 max-w-sm font-medium">{errorMessage}</p>
              <button 
                onClick={resetScanner}
                className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors shadow-sm transform active:scale-95"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {status === 'idle' && (
          <div className="p-8 bg-white border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Or Enter Barcode Manually</h3>
            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <ScanLine className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="e.g., 3017620422003"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all text-lg font-mono placeholder-gray-400"
                  pattern="\d*"
                />
              </div>
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all shadow-sm"
              >
                Lookup <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerPage;
