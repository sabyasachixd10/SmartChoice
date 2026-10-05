# OCR Image Upload Feature

## Purpose
The OCR Image Upload feature (Task 24) is responsible for securely capturing, validating, and previewing product label images locally in the user's browser. It establishes the foundation for future OCR text extraction workflows without performing any network transmission or external API processing at this stage.

## Task Boundary
This implementation strictly stops at the image preview state. 
It **does not** include:
- OCR parsing or text recognition (Task 25)
- Ingredient/nutrition extraction
- Image uploads to the Node.js backend
- Calls to Tesseract.js, Gemini, or Open Food Facts

## Supported Image Types
The upload component strictly validates the MIME type against the following standard web image formats:
- `image/jpeg`
- `image/png`
- `image/webp`

Unsupported formats are actively rejected by the frontend validation logic.

## File Size Limit
To prevent memory exhaustion and prepare for future OCR engine limitations, a hard limit of **10 MB** is enforced on all selected files.

## Camera Capture Behavior
For mobile devices and supported browsers, a distinct "Take Photo" action utilizes the `capture="environment"` attribute. This triggers the native device camera interface seamlessly without requiring complex WebRTC permissions or persistent streaming.
- Standard file selection is retained as the primary fallback for desktop users.

## Browser Behavior & Preview Lifecycle
1. User selects a file or captures a photo.
2. The component validates the size and MIME type.
3. A temporary, safe `Blob` URL is generated via `URL.createObjectURL(file)`.
4. The image is rendered in a bounded, responsive preview container.
5. If the user removes the image, replaces the image, or unmounts the component, `URL.revokeObjectURL()` is explicitly called to prevent memory leaks.

## Privacy Behavior
- Zero Network Transmission: The selected image remains entirely local to the React browser memory.
- No files are written to the filesystem.
- No telemetry or image data is logged.

## Validation States
- **Valid:** Displays the image preview along with its filename, calculated size in MB, and a success banner indicating readiness for processing.
- **Invalid Type:** Rejects the file and displays, "Please select a supported image file (JPEG, PNG, WebP)."
- **Oversized:** Rejects the file and displays, "Image must be smaller than 10 MB."

## Limitations
- OCR text extraction is not yet implemented.
- The component does not crop, rotate, or preprocess the image (brightness/contrast adjustment), which may be required for optimal OCR accuracy in future tasks.

## Relationship to Task 25
This task explicitly prepares the file object and validation states. Task 25 will hook into the `selectedFile` state of `OcrPage.jsx` to inject the OCR engine (e.g., Tesseract.js) and extract text from the validated image blob.
