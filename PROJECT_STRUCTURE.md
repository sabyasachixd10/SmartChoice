# SmartChoice - Project Structure

The project will use a monorepo approach, housing both the frontend and backend in the same repository for ease of development.

```text
SmartChoice/
│
├── ARCHITECTURE.md          # System architecture documentation
├── DEVELOPMENT_PLAN.md      # Phased implementation plan
├── PROJECT_STRUCTURE.md     # This file
│
├── frontend/                # React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── public/              # Static assets (images, icons)
│   └── src/
│       ├── main.jsx         # Application entry point
│       ├── App.jsx          # Root component & Routing
│       ├── index.css        # Global styles & Tailwind directives
│       ├── components/      # Reusable UI components
│       │   ├── common/      # Buttons, Inputs, Modals, Loaders
│       │   ├── layout/      # Navbar, Footer, Sidebar
│       │   └── product/     # ProductCard, ScoreBadge, NutritionTable
│       ├── pages/           # Route-level components
│       │   ├── Home.jsx
│       │   ├── SearchResults.jsx
│       │   ├── ProductDetail.jsx
│       │   ├── Compare.jsx
│       │   └── Profile.jsx
│       ├── context/         # React Context (AuthContext, PreferenceContext)
│       ├── hooks/           # Custom React hooks (useScanner, useAuth)
│       ├── services/        # API call wrappers (api.js, auth.service.js)
│       └── utils/           # Helper functions (formatting, parsing)
│
└── backend/                 # Node.js + Express application
    ├── package.json
    ├── .env.example         # Environment variable template
    ├── server.js            # Express app initialization and server start
    └── src/
        ├── config/          # Database connection, constants
        ├── controllers/     # Request handling logic
        │   ├── authController.js
        │   ├── productController.js
        │   └── userController.js
        ├── models/          # Mongoose schemas
        │   ├── User.js
        │   ├── Preference.js
        │   └── SavedProduct.js
        ├── routes/          # API route definitions
        │   ├── authRoutes.js
        │   ├── productRoutes.js
        │   └── userRoutes.js
        ├── services/        # Core business logic
        │   ├── openFoodFactsService.js # External API integration
        │   ├── scoringEngine.js        # SmartChoice calculation logic
        │   └── recommendationService.js# Logic for finding alternatives
        ├── middlewares/     # Express middlewares
        │   ├── authMiddleware.js
        │   ├── errorMiddleware.js
        │   └── rateLimiter.js
        └── utils/           # Helper functions
            ├── scoreCalculator.js
            └── logger.js
```
