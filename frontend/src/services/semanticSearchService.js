import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const searchSemanticProducts = async (query, limit = 10) => {
  try {
    const response = await axios.get(`${API_URL}/search/semantic`, {
      params: { q: query, limit }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to perform semantic search');
  }
};
