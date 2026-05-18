import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // https://your-backend.onrender.com/api
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['x-auth-token'] = token;
  config.headers['Content-Type'] = 'application/json';
  return config;
});

export default API;