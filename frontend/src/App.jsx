import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import {
  Home, Search, ProductDetail, Compare, Scanner, OCR,
  Recommendations, Dashboard, History, Profile, Login, Register, About
} from './pages/Pages';
import { ComparisonProvider } from './context/ComparisonContext';
import { PreferenceProvider } from './context/PreferenceContext';
import PreferencesPage from './pages/PreferencesPage';

function App() {
  return (
    <PreferenceProvider>
      <ComparisonProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="compare" element={<Compare />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="ocr" element={<OCR />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="preferences" element={<PreferencesPage />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
            <Route path="about" element={<About />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
      </ComparisonProvider>
    </PreferenceProvider>
  );
}

export default App;
