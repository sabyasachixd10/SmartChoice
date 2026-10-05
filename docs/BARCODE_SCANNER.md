# Barcode Scanner Feature

## Architecture
The Barcode Scanner is built as a pure frontend feature using React and the `html5-qrcode` library. It directly interfaces with the device camera to extract barcode strings, which are then passed to the existing backend API endpoint `GET /api/products/barcode/:barcode` via `productService.js`. No new backend endpoints or database structures were required.

## Scanning Library
We implemented **html5-qrcode** because it is a maintained, browser-compatible library that functions across mobile and desktop devices without requiring native plugins.

## Supported Barcode Formats
The scanner is explicitly configured to support common retail food product formats:
- **EAN-13**
- **EAN-8**
- **UPC-A**
- **UPC-E**
- **QR_CODE** (Fallback for some modern product links)

## Camera Permission Requirements
The browser will prompt the user for camera permissions upon component mount. The `BarcodeScanner` component includes distinct UI states to handle:
- Idle (requesting permission)
- Permission granted (active scanning)
- Permission denied/Camera unavailable (error state with fallback prompt)

## Manual Fallback
To ensure usability across all devices (including desktops without cameras or unsupported browsers), a manual barcode entry form is provided. This form:
- Restricts input to plausible barcode formats (numeric strings, 6-14 characters).
- Interfaces with the exact same lookup pipeline as the visual scanner.

## API Flow
1. Barcode is detected (visually or manually).
2. The scanner stops to prevent duplicate API requests.
3. The UI transitions to a "loading" state.
4. `productService.getProductByBarcode(barcode)` is invoked, calling the existing `GET /api/products/barcode/:barcode` endpoint.
5. On success, the user is seamlessly routed to the existing Product Details page (`/product/:id`).
6. On failure (e.g., 404), the UI presents a "Product Not Found" state with an option to retry.

## Privacy & Security Behavior
- The camera stream remains entirely local to the user's browser.
- No images or video frames are transmitted to the backend.
- The camera stream is aggressively cleaned up (stopped and cleared) whenever the scanner stops, the user navigates away, or the component unmounts.
- No new secrets (API keys, DB credentials) were introduced or exposed.

## Testing Procedure
1. Run the frontend application (`npm run dev`).
2. Navigate to the "Scan" tab.
3. Accept camera permissions.
4. Scan a known food barcode (or type `3017620422003` manually for Nutella, or another valid product in the DB).
5. Verify successful navigation to the Product Details page.
6. Input an invalid barcode manually (e.g., `00000000`) and verify the "Product Not Found" screen appears.
7. Navigate away from the page and verify the camera light turns off (resources released).

## Browser Limitations
- Requires a secure context (HTTPS or `localhost`) to access `navigator.mediaDevices`.
- Some iOS devices may restrict camera access within embedded webviews. The manual fallback mitigates this entirely.
