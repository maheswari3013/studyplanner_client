import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// ADD THIS BLOCK - it will tell you exactly what's calling /api
API.interceptors.request.use((config) => {
  if (config.url === '/' || config.url === '') {
    console.trace('FOUND THE 404 CALLER:'); // This prints the full stack trace
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handles 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth';
        toast.error('Session expired. Please login again.');
      }
    }
    return Promise.reject(error);
  }
);

export default API;