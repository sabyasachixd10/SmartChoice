import React, { useState } from 'react';
import OcrImageUpload from '../components/OcrImageUpload';
import OcrProcessor from '../components/OcrProcessor';
import { FileText, Info, Camera, CheckCircle } from 'lucide-react';

const OcrPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleImageSelected = (file) => {
    setSelectedFile(file);
  };

  const handleImageRemoved = () => {
    setSelectedFile(null);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 text-indigo-700 rounded-2xl mb-4 shadow-inner">
          <Camera className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Scan Product Label</h1>
        <p className="text-xl text-gray-500 max-w-xl mx-auto">Upload an image of a nutritional facts panel or ingredient list to instantly analyze the product.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8">
        <div className="p-8 lg:p-12">
          <OcrImageUpload 
            onImageSelected={handleImageSelected}
            onImageRemoved={handleImageRemoved}
          />

          <OcrProcessor imageFile={selectedFile} />
        </div>
      </div>
      
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-8 border border-indigo-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Info className="w-24 h-24 text-indigo-900" />
        </div>
        <div className="relative z-10">
          <h4 className="font-extrabold text-indigo-900 text-lg mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2" /> Tips for Best Results
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 shrink-0 mt-0.5" />
              <span className="text-indigo-800 font-medium text-sm">Ensure the image is well-lit and the text is clearly readable.</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 shrink-0 mt-0.5" />
              <span className="text-indigo-800 font-medium text-sm">Focus directly on the ingredients list or nutrition table.</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 shrink-0 mt-0.5" />
              <span className="text-indigo-800 font-medium text-sm">Supported formats: JPEG, PNG, or WebP.</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-5 h-5 text-indigo-600 mr-3 shrink-0 mt-0.5" />
              <span className="text-indigo-800 font-medium text-sm">Maximum file size is 10MB per image.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OcrPage;
