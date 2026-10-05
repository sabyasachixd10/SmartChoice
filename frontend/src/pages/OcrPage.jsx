import React, { useState } from 'react';
import OcrImageUpload from '../components/OcrImageUpload';
import { FileText, Info } from 'lucide-react';

const OcrPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImageSelected = (file) => {
    setSelectedFile(file);
  };

  const handleImageRemoved = () => {
    setSelectedFile(null);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Scan Product Label</h1>
        </div>
        <p className="text-gray-600 mb-8">
          Upload an image of a product's ingredient list or nutritional facts panel.
        </p>

        <OcrImageUpload 
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
        />

        {selectedFile && (
          <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-4">
            <Info className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 mb-1">
                Image ready for OCR processing.
              </h3>
              <p className="text-indigo-700">
                The image has been successfully captured and validated locally in your browser. 
                (OCR text extraction is not yet implemented in this task.)
              </p>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 rounded-xl p-6 border text-sm text-gray-600">
        <h4 className="font-semibold text-gray-800 mb-2">How it works:</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Select a clear, well-lit image of the product's ingredients.</li>
          <li>Ensure text is readable and not blurred.</li>
          <li>Your image remains securely on your device until processed.</li>
          <li>Processing is limited to 10MB JPEG, PNG, or WebP files.</li>
        </ul>
      </div>
    </div>
  );
};

export default OcrPage;
