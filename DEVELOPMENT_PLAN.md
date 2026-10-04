# SmartChoice - Development Plan

This document outlines the phased development approach for the SmartChoice application.

## Phase 1: Project Setup & Foundation (Week 1)
**Goal:** Establish the monorepo structure, initialize tools, and create the basic skeleton.
- [ ] Initialize Git repository.
- [ ] Create `frontend` directory: Scaffold React app with Vite, configure Tailwind CSS.
- [ ] Create `backend` directory: Initialize Node.js/Express, set up basic middleware (Helmet, CORS, dotenv).
- [ ] Set up MongoDB Atlas cluster and connect backend via Mongoose.
- [ ] Define basic Project Structure and linting/formatting rules (ESLint, Prettier).

## Phase 2: Core Data & External API Integration (Week 2)
**Goal:** Connect to Open Food Facts and display basic product data.
- [ ] Backend: Create service to fetch data from Open Food Facts API (Search by name, Get by barcode).
- [ ] Backend: Create basic API endpoints to expose this data to the frontend.
- [ ] Frontend: Build Search Bar component.
- [ ] Frontend: Build Product List and basic Product Detail view.
- [ ] Frontend: Implement loading states and error handling for API calls.

## Phase 3: SmartChoice Scoring & Comparison Logic (Week 3)
**Goal:** Implement the core value proposition—scoring and comparing products.
- [ ] Backend: Develop the SmartChoice Scoring Engine (Nutrition normalization, additive penalty, NOVA processing score).
- [ ] Backend: Implement logic to find and return "similar products" from the API.
- [ ] Backend: Create Comparison API endpoint.
- [ ] Frontend: Design and build the SmartChoice Score Badge (visual indicator).
- [ ] Frontend: Build the Comparison View (side-by-side table of ingredients and nutrition).
- [ ] Frontend: Display clear, transparent explanations of the score.

## Phase 4: User Accounts & Personalization (Week 4)
**Goal:** Allow users to save preferences and products.
- [ ] Backend: Create User and Preference Mongoose models.
- [ ] Backend: Implement JWT Authentication (Register, Login, Middleware).
- [ ] Backend: Create endpoints for saving/updating dietary preferences and allergens.
- [ ] Backend: Create endpoints for saving/removing favorite products.
- [ ] Frontend: Build Auth UI (Login/Register modals or pages).
- [ ] Frontend: Build Profile Dashboard to manage preferences.
- [ ] Backend/Frontend Integration: Update Scoring Engine to account for user-specific preferences (e.g., flag allergens).

## Phase 5: Advanced Features (Week 5)
**Goal:** Implement specialized input methods and AI features.
- [ ] Frontend: Integrate `html5-qrcode` for barcode scanning via device camera.
- [ ] Frontend: Integrate `Tesseract.js` for basic Nutrition Label OCR (extracting text from images).
- [ ] Backend: (Optional) Set up RAG-based product retrieval or AI-generated explanations if external AI APIs are integrated.
- [ ] Frontend: Implement Search History tracking.

## Phase 6: Polish, Testing & Deployment (Week 6)
**Goal:** Ensure application stability and deploy to production.
- [ ] Testing: Write Unit tests for the Scoring Engine and core Backend Services.
- [ ] Testing: Write Integration tests for critical API routes.
- [ ] UI/UX: Polish responsive design, ensure accessibility, add micro-animations.
- [ ] Performance: Optimize API calls, implement basic backend caching if necessary.
- [ ] Deployment: Deploy Backend to Render/Railway, Database to MongoDB Atlas, and Frontend to Vercel.
