# SmartChoice

SmartChoice is a full-stack application designed to help users compare packaged food products based on nutrition, ingredients, additives, processing information, and user preferences.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **External Data**: Open Food Facts API

## Project Structure
The project uses a monorepo structure:
- `/frontend`: React application
- `/backend`: Express.js API
- `/docs`: Project documentation
- `/shared`: Shared utilities/types
- `/data`: Static data and seeders

## Getting Started
See [docs/SETUP.md](./docs/SETUP.md) for detailed instructions on local setup and installation.

### MongoDB Setup
A MongoDB database is required. Ensure you provide a valid connection string:
1. Copy `.env.example` to `.env`.
2. Update `MONGODB_URI` (e.g., `mongodb://localhost:27017/smartchoice` for local MongoDB).

### Open Food Facts Integration
The application uses the official Open Food Facts API (v2) to fetch missing product data automatically. It transparently stores the retrieved data locally for faster subsequent queries.

### Quick Start
```bash
# Install dependencies
npm run install:all

# Run both frontend and backend
npm run dev
```

## Documentation
- [Architecture](ARCHITECTURE.md)
- [Development Plan](DEVELOPMENT_PLAN.md)
- [Setup Guide](docs/SETUP.md)
- [Database Architecture](docs/DATABASE.md)
