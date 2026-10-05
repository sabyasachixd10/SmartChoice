import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { AlertCircle, Camera } from 'lucide-react';

const BarcodeScanner = ({ onDetected, onError, onStop }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const containerId = 'html5qr-code-full-region';

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const hasCamera = await Html5Qrcode.getCameras();
        if (hasCamera && hasCamera.length > 0) {
          if (isMounted) setHasPermission(true);
          
          html5QrCode = new Html5Qrcode(containerId, {
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.QR_CODE
            ]
          });
          
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (isMounted && onDetected) {
                // Pause scanner or stop it to prevent multiple scans
                onDetected(decodedText);
              }
            },
            (errorMessage) => {
              // Ignore frequent scan errors
            }
          );
        } else {
          if (isMounted) {
            setErrorMsg('No cameras found on your device.');
            if (onError) onError('No cameras found');
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Camera permission denied or camera unavailable.');
          if (onError) onError(err);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear();
        }).catch(err => console.error("Failed to stop scanner", err));
      }
    };
  }, [onDetected, onError]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {!hasPermission && !errorMsg && (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-gray-50 rounded-lg w-full">
          <Camera className="w-12 h-12 mb-4 text-gray-400" />
          <p>Requesting camera permission...</p>
        </div>
      )}
      
      {errorMsg && (
        <div className="flex flex-col items-center justify-center p-6 text-center text-red-600 bg-red-50 rounded-lg w-full">
          <AlertCircle className="w-10 h-10 mb-2" />
          <p>{errorMsg}</p>
        </div>
      )}

      <div 
        id={containerId} 
        className={`w-full overflow-hidden rounded-lg bg-black ${errorMsg ? 'hidden' : 'block'}`}
      ></div>
      
      <div className="mt-4 text-center text-sm text-gray-600">
        Point your camera at the barcode
      </div>
    </div>
  );
};

export default BarcodeScanner;
