import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const queryRag = async (query, topK = 5) => {
  try {
    const response = await axios.post(`${API_URL}/rag/query`, {
      query,
      topK
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.error || `Server error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error('Network error: Could not connect to the SmartChoice backend.');
    } else {
      throw new Error(error.message || 'An unexpected error occurred.');
    }
  }
};
