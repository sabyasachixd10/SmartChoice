import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const OcrImageUpload = ({ onImageSelected, onImageRemoved }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please select a supported image file (JPEG, PNG, WebP).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be smaller than 10 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      return;
    }

    // Revoke previous URL if replacing
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileInfo({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    });

    if (onImageSelected) {
      onImageSelected(file);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setFileInfo(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    
    if (onImageRemoved) {
      onImageRemoved();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 text-red-700 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!previewUrl ? (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 text-center">
          <div className="flex gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <ImageIcon className="w-8 h-8" />
            </div>
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Camera className="w-8 h-8" />
            </div>
          </div>
          
          <h3 className="text-lg font-bold text-gray-900 mb-2">Upload a product label image</h3>
          <p className="text-gray-500 mb-6 max-w-xs text-sm">
            Take a clear photo of the ingredients or nutrition panel, or upload an existing image. Max size 10MB.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {/* Standard file picker */}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              Choose Image
            </button>

            {/* Mobile camera capture (where supported) */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={handleFileChange}
            />
            <button 
              onClick={() => cameraInputRef.current?.click()}
              className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
          <div className="relative w-full bg-gray-100 flex items-center justify-center" style={{ minHeight: '300px' }}>
            <img 
              src={previewUrl} 
              alt="Label preview" 
              className="max-w-full max-h-[60vh] object-contain"
            />
            <button
              onClick={handleRemove}
              className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm text-gray-700 hover:text-red-600 rounded-full shadow-sm hover:shadow transition-all"
              title="Remove image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="overflow-hidden">
              <p className="font-medium text-gray-900 truncate" title={fileInfo?.name}>
                {fileInfo?.name}
              </p>
              <p className="text-sm text-gray-500">{fileInfo?.size}</p>
            </div>
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
            >
              Replace Image
            </button>
          </div>
          
          {/* Hidden input used for replace action */}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};

export default OcrImageUpload;
