# SmartChoice - System Architecture

This document outlines the architecture for the **SmartChoice** application, a full-stack platform designed to help users compare packaged food products based on nutrition, ingredients, additives, processing, and personal preferences.

## 1. System Architecture
SmartChoice follows a standard 3-tier client-server architecture:
- **Client Tier:** A responsive Single Page Application (SPA) built with React and Vite.
- **Application Tier:** A RESTful API built with Node.js and Express.js that handles business logic, scoring, and external API orchestration.
- **Data Tier:** A MongoDB database for persistent storage of user profiles, preferences, and cached product data.
- **External Services:** The Open Food Facts API is used as the primary data source for food product information.

## 2. Frontend Architecture
The frontend is built using **React** and **Vite** with **JavaScript**, styled with **Tailwind CSS**.
- **State Management:** React Context API for global state (Auth, User Preferences, Theme) and local component state.
- **Routing:** React Router DOM for client-side navigation (`/`, `/search`, `/product/:id`, `/compare`, `/profile`).
- **Data Fetching:** Axios for making HTTP requests to the backend API.
- **UI Components:** Modular, reusable components (e.g., ProductCard, NutritionTable, ScoreBadge). Icons provided by Lucide React. Charts rendered using Recharts.
- **Specialized Modules:**
  - Barcode Scanning: `html5-qrcode` integration.
  - Nutrition Label OCR: `Tesseract.js` integration.

## 3. Backend Architecture
The backend is a monolithic RESTful API built with **Node.js** and **Express.js**.
- **Layered Design:**
  - **Routes:** Define API endpoints and HTTP methods.
  - **Controllers:** Handle HTTP requests/responses, input validation, and coordinate services.
  - **Services:** Contain business logic (SmartChoice scoring, recommendation logic, Open Food Facts API orchestration).
  - **Models:** Mongoose schemas defining data structure and database interactions.
  - **Middleware:** Authentication (JWT), error handling, security headers (Helmet), and rate limiting.

## 4. Database Architecture
**MongoDB** (via Mongoose) is used for flexible document storage.
Core Collections:
- `Users`: Stores user credentials (hashed), profile data.
- `Preferences`: Stores user-specific dietary preferences, allergies, and ingredient avoidances.
- `SavedProducts`: Links users to their favorited or saved items.
- `SearchHistory`: Logs user search queries for personalized recommendations.
- `ProductCache` (Optional/Future): Temporarily stores frequently accessed products from Open Food Facts to reduce API latency and rate limiting.

## 5. API Architecture
The backend exposes a RESTful API.
Key Endpoints:
- `/api/auth/*`: Register, login, profile management.
- `/api/products/search`: Search products (proxies/enhances Open Food Facts).
- `/api/products/:barcode`: Get detailed product information.
- `/api/products/compare`: Compare multiple products.
- `/api/products/recommend`: Get alternatives based on a specific product and user preferences.
- `/api/user/preferences`: Get/update user dietary preferences.

## 6. Data Flow (Core Workflow)
1. User enters a search term or scans a barcode on the Frontend.
2. Frontend sends request to Backend (`/api/products/search`).
3. Backend Service queries the Open Food Facts API.
4. Backend retrieves raw product data.
5. Backend applies the **SmartChoice Scoring Engine** to the raw data, incorporating user preferences if authenticated.
6. Backend identifies similar products (using category/tags) for comparison/recommendation.
7. Backend sends enriched, scored, and normalized JSON response back to Frontend.
8. Frontend renders results, highlighting the SmartChoice score and major differences.

## 7. SmartChoice Scoring Architecture
The scoring engine evaluates products based on multiple dimensions to generate a transparent final score (e.g., 0-100 or A-F grade).
- **Nutritional Value:** Normalizes macros (sugar, fat, sodium) per 100g. Compares against daily recommended values.
- **Ingredient Quality:** Analyzes ingredient list. Penalizes highly processed ingredients.
- **Additives:** Checks additive codes against a known database of health impacts.
- **Processing (NOVA):** Utilizes NOVA classification (1-4) provided by Open Food Facts to penalize ultra-processed foods.
- **Allergens & Preferences:** Filters or heavily penalizes products containing user-specified allergens or avoided ingredients.

## 8. Recommendation Architecture
When a user views a product, the system suggests healthier alternatives.
- **Identification:** Finds products in the same category (e.g., "Breakfast Cereals").
- **Filtering:** Removes products containing user allergens.
- **Ranking:** Sorts alternatives based on their SmartChoice score relative to the current product, highlighting *why* the alternative is better (e.g., "50% less sugar").

## 9. Security Architecture
- **Authentication:** JSON Web Tokens (JWT) for stateless session management.
- **Password Protection:** bcrypt for hashing user passwords before storage.
- **Headers:** Helmet.js to set secure HTTP headers (XSS protection, no-sniff, etc.).
- **CORS:** Configured to strictly allow requests only from the trusted frontend domain.
- **Rate Limiting:** Protects endpoints (especially Auth and External API proxies) against brute-force and DDoS attacks.
- **Input Sanitization:** Mongoose validation and Express middleware to prevent NoSQL injection and XSS.

## 10. Testing Strategy
- **Unit Tests:** Jest for testing utility functions, SmartChoice scoring algorithms, and isolated React components.
- **Integration Tests:** Supertest + Jest for testing backend API routes with a test database.
- **E2E Tests (Future):** Cypress or Playwright to test critical user flows (login, search, compare).

## 11. Deployment Strategy
- **Frontend:** Hosted on Vercel or Netlify for fast global CDN delivery and easy CI/CD integration.
- **Backend:** Hosted on Render, Railway, or Heroku.
- **Database:** MongoDB Atlas (Cloud-hosted MongoDB).
- **CI/CD:** GitHub Actions to automatically run tests and trigger deployments on merge to the main branch.
