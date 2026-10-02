import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures HTTP-Only cookies are sent and received
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize error message extraction
    const customMessage =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.errors)
        ? error.response.data.errors.join(', ')
        : error.message || 'An unexpected error occurred');
    
    return Promise.reject(new Error(customMessage));
  },
);
