# OCR Parser

## OCR Architecture
The SmartChoice OCR parser is a pure-frontend deterministic pipeline. It takes an image selected by the user and passes it to **Tesseract.js** (running in the browser via WebAssembly). Once Tesseract produces raw text, a local service (`ocrParser.js`) uses string-matching heuristics to classify sections and extract structured data.

## Tesseract.js Usage
- Loaded locally within the browser.
- Configured to support both English (`eng`) and French (`fra`) simultaneously since food labels often contain both.
- Progress events are mapped into a user-friendly UI state.

## Raw Text Handling
Raw text is always preserved and exposed to the user. This ensures transparency so users can easily visually verify what the engine "saw" vs what it "parsed".

## Ingredient Parsing
- Scans line-by-line for strong headers (`ingredients:`, `ingrédients`, `ingredients list`).
- Extracts everything following the header until a known "stop header" (e.g., `Nutrition Facts`, `Allergens`, `Storage`) is encountered.
- Returns a raw string block. We intentionally avoid splitting by comma into arrays at this stage because OCR commas are unreliable.

## Nutrition Parsing
- Uses a deterministic dictionary of labels mapped to expected standard units (e.g., `Carbohydrates` -> `g`, `Sodium` -> `mg`).
- Gracefully handles common numeric OCR corruption via regex substitution (e.g., `O` instead of `0`, `l` instead of `1`, `S` instead of `5`) but *only* on lines that already match a nutrition label.
- Supports both `.` and `,` as decimal separators.

## Nutrition Basis Detection
- Strongly enforces the detection of the nutrition basis.
- Scans for keywords: `per 100g`, `per 100ml`, `per serving`, `per portion`.
- If no basis is found, it falls back to `unknown`, emitting a warning. 
- OCR data is fundamentally unsafe for consumption scoring without a known basis.

## Confidence and Uncertainty
- Missing units trigger a warning but assume standard defaults (e.g., grams).
- Unparsed sections (no ingredients found) emit a warning.
- Missing values trigger an "Incomplete nutrition fields" warning if fewer than 3 values are extracted.
- At this stage, all parsed fields are uniformly tagged with a `medium` or `low` confidence flag because OCR is inherently probabilistic.

## OCR Limitations
- Does not automatically correct gross spelling errors in ingredients.
- Heavily dependent on image lighting and clarity.
- Fails on curved text or extremely small fonts.

## Privacy Behavior
- Everything runs client-side in the browser.
- No network requests are made to Gemini, Hugging Face, or the Node.js backend.
- Images and raw text are never stored or logged externally.

## Distinction between OCR-derived and Verified Product Data
This parser produces an isolated, candidate JSON object. 
- It does **not** generate a `Product` MongoDB document.
- It is clearly flagged in the UI: *"Extracted from image — not verified."*
- Future workflows will dictate if/how this candidate data is merged into the SmartChoice verified datasets.
