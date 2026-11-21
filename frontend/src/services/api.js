import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Attach Authorization header if JWT token is stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('triad_dms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
