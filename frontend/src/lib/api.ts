import axios from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Ensures HTTP-Only cookies are sent and received
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: Attach JWT Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('lifepilot_token');
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Handle responses and standardized error extraction
api.interceptors.response.use(
  (response) => {
    // If response body returns a refreshed or new token, store it
    if (response.data?.token && typeof window !== 'undefined') {
      localStorage.setItem('lifepilot_token', response.data.token);
    }
    return response;
  },
  (error) => {
    // Network / connection errors
    if (!error.response) {
      const networkMsg =
        error.code === 'ECONNABORTED'
          ? 'Request timed out connecting to LifePilot backend'
          : 'Unable to connect to LifePilot server (http://localhost:4000). Please ensure backend is running.';
      return Promise.reject(new Error(networkMsg));
    }

    const status = error.response.status;

    // Handle 401 Unauthorized
    if (status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('lifepilot_token');
      localStorage.removeItem('lifepilot_demo_session');
    }

    // Standardize error message extraction
    const customMessage =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.errors)
        ? error.response.data.errors.join(', ')
        : error.message || 'An unexpected error occurred');

    return Promise.reject(new Error(customMessage));
  },
);
