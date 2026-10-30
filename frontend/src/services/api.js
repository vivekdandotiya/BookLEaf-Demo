import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bookleaf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth expirations and format errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'Something went wrong';

    if (error.response?.status === 401) {
      // Auto-logout if token expired or invalid
      if (localStorage.getItem('bookleaf_token')) {
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
        window.location.href = '/login?expired=true';
      }
    }

    return Promise.reject({
      status: error.response?.status,
      code: errorData?.code || 'ERROR',
      message,
      details: errorData?.details || null,
    });
  }
);

export default api;
