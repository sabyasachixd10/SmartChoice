import React, { useState, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { parseOcrText } from '../services/ocrParser';
import { Play, Loader2, AlertCircle, FileText, CheckCircle } from 'lucide-react';

const OcrProcessor = ({ imageFile }) => {
  const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, COMPLETE, ERROR, EMPTY
  const [progress, setProgress] = useState({ status: '', progress: 0 });
  const [rawText, setRawText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageUrl, setImageUrl] = useState(null);

  // Maintain image URL for Tesseract
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      // Reset state if image changes
      setStatus('IDLE');
      setRawText('');
      setParsedData(null);
      setErrorMsg('');
      setProgress({ status: '', progress: 0 });

      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  const handleExtractText = async () => {
    if (!imageUrl) return;
    
    setStatus('PROCESSING');
    setErrorMsg('');
    setProgress({ status: 'Preparing image...', progress: 0 });

    try {
      const result = await Tesseract.recognize(
        imageUrl,
        'eng+fra', // Support English and French typical for food labels
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress({ status: 'Recognizing text...', progress: Math.round(m.progress * 100) });
            } else {
              setProgress({ status: m.status, progress: 0 });
            }
          }
        }
      );

      const text = result.data.text;
      setRawText(text);

      if (!text || text.trim().length === 0) {
        setStatus('EMPTY');
      } else {
        const parsed = parseOcrText(text);
        setParsedData(parsed);
        setStatus('COMPLETE');
      }
    } catch (err) {
      console.error(err);
      setStatus('ERROR');
      setErrorMsg('Failed to process image. ' + (err.message || ''));
    }
  };

  const resetOcr = () => {
    setStatus('IDLE');
    setRawText('');
    setParsedData(null);
    setProgress({ status: '', progress: 0 });
    setErrorMsg('');
  };

  if (!imageFile) return null;

  return (
    <div className="mt-8 border-t pt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">OCR Processing</h2>
        {status === 'IDLE' && (
          <button
            onClick={handleExtractText}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Extract Text
          </button>
        )}
        {(status === 'COMPLETE' || status === 'ERROR' || status === 'EMPTY') && (
          <button
            onClick={resetOcr}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Re-run OCR
          </button>
        )}
      </div>

      {status === 'PROCESSING' && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-indigo-900 font-medium mb-2">{progress.status}</p>
          {progress.progress > 0 && (
            <div className="w-full max-w-xs bg-indigo-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${progress.progress}%` }}
              ></div>
            </div>
          )}
          <p className="text-indigo-600 text-sm">{progress.progress}%</p>
        </div>
      )}

      {status === 'ERROR' && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex flex-col items-center justify-center text-red-700">
          <AlertCircle className="w-10 h-10 mb-2" />
          <h3 className="font-bold">OCR Failed</h3>
          <p>{errorMsg}</p>
        </div>
      )}

      {status === 'EMPTY' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 flex flex-col items-center justify-center text-amber-700">
          <AlertCircle className="w-10 h-10 mb-2" />
          <h3 className="font-bold">No Text Found</h3>
          <p>The OCR engine could not detect any readable text in this image.</p>
        </div>
      )}

      {status === 'COMPLETE' && parsedData && (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-green-900">Processing Complete</h3>
              <p className="text-green-800 text-sm">
                Extracted from image — not verified. Do not use for medical or dietary critical decisions.
              </p>
            </div>
          </div>

          {parsedData.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Warnings
              </h4>
              <ul className="list-disc pl-5 text-sm text-amber-800 space-y-1">
                {parsedData.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b px-4 py-3 font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Raw OCR Text
              </div>
              <div className="p-4 bg-gray-50 text-xs font-mono text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {rawText}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b px-4 py-3 font-semibold text-gray-800">
                  Ingredients
                </div>
                <div className="p-4">
                  {parsedData.ingredients.available ? (
                    <div>
                      <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border font-mono">
                        {parsedData.ingredients.text}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">Confidence: {parsedData.ingredients.confidence}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Ingredient section not detected.</p>
                  )}
                </div>
              </div>

              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-gray-50 border-b px-4 py-3 font-semibold text-gray-800 flex justify-between items-center">
                  <span>Nutrition Facts</span>
                  <span className="text-xs font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    Basis: {parsedData.nutrition.basis}
                  </span>
                </div>
                <div className="p-4">
                  {parsedData.nutrition.available ? (
                    <div className="space-y-2">
                      {Object.entries(parsedData.nutrition.values).map(([key, data]) => (
                        <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                          <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-sm font-medium">
                            {data.value} {data.unit}
                          </span>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 mt-4">Confidence: {parsedData.nutrition.confidence}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Nutrition section not detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OcrProcessor;
