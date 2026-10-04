# SmartChoice Setup Guide

This document describes how to set up the SmartChoice application locally.

## Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas cluster)
- Git

## 1. Environment Setup
1. Copy the `.env.example` file in the root directory and rename it to `.env`.
2. Update the `MONGODB_URI` if necessary (defaults to `mongodb://localhost:27017/smartchoice`).
3. Keep `PORT=8080` and `CLIENT_URL=http://localhost:5173`.

## 2. Installation
From the root directory, install all dependencies for both frontend and backend:
```bash
npm run install:all
```
*(Or install manually by running `npm install` in the root, `frontend`, and `backend` directories).*

## 3. Running the Application

### Option A: Run concurrently (Recommended)
From the root directory:
```bash
npm run dev
```
This will start both the React frontend and the Express backend simultaneously.

### Option B: Run separately
**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 4. Verification
- Backend API should be running at `http://localhost:8080`
- Check health: `GET http://localhost:8080/api/health`
- Frontend should be running at `http://localhost:5173`
- Open the frontend URL in your browser and verify the pages load.
