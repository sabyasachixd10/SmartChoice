import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export const searchProducts = async (query) => {
  const response = await axios.get(`${API_URL}/products/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const getProductById = async (id) => {
  const response = await axios.get(`${API_URL}/products/${id}`);
  return response.data;
};

export const getProductScore = async (id, prefs = {}) => {
  const queryParams = new URLSearchParams(prefs).toString();
  const url = `${API_URL}/products/${id}/score${queryParams ? `?${queryParams}` : ''}`;
  const response = await axios.get(url);
  return response.data;
};

export const getRecommendations = async (productIds, preferences = {}) => {
  const response = await axios.post(`${API_URL}/recommendations`, { productIds, preferences });
  return response.data;
};

export const getProductByBarcode = async (barcode) => {
  const response = await axios.get(`${API_URL}/products/barcode/${barcode}`);
  return response.data;
};
