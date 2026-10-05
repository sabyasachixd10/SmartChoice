import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BarcodeScanner from '../components/BarcodeScanner';
import { getProductByBarcode } from '../services/productService';
import { Search, AlertCircle, RefreshCw } from 'lucide-react';

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
      // Typically 404 from our API goes here
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
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Barcode</h1>
        <p className="text-gray-600 mb-6">Scan a product barcode to view details, score, and recommendations.</p>

        {status === 'idle' && (
          <BarcodeScanner 
            onDetected={handleBarcodeDetected} 
            onError={(err) => {
              // We just let the scanner show its own error, but we can set manual fallback focus
            }}
          />
        )}

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <RefreshCw className="w-12 h-12 text-green-600 animate-spin mb-4" />
            <h2 className="text-xl font-semibold">Finding product...</h2>
            <p className="text-gray-500 mt-2">Looking up barcode: {detectedBarcode}</p>
          </div>
        )}

        {status === 'not-found' && (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-6">
              No product was found for barcode <strong>{detectedBarcode}</strong>.
            </p>
            <button 
              onClick={resetScanner}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 rounded-lg">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <button 
              onClick={resetScanner}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'idle' && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Enter Barcode Manually</h3>
            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="e.g., 3017620422003"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                pattern="\d*"
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-6 py-2 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerPage;
