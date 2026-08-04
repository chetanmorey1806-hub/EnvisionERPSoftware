import axios from 'axios';

// 1. Create instance with baseline defaults
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second response timeout protection
});

// 2. Request Interceptor: Inject Authorization Headers on every outbound call
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Response Interceptor: Global Exception Middleware & Automatic Rejection Handlers
api.interceptors.response.use(
  (response) => {
    // Return the response data block directly when successful
    return response;
  },
  (error) => {
    // Handle structural HTTP edge errors gracefully
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401: // Unauthorized: Token expired or manipulated
          localStorage.removeItem('token');
          // Smooth redirect to system login gate without killing state
          if (window.location.pathname !== '/login') {
            window.location.href = '/login?msg=session_expired';
          }
          break;

        case 403: // Forbidden: Correct token, insufficient permissions
          console.error('[Security Breach] Access to requested endpoint denied.');
          break;

        case 500: // Internal Server Error
          console.error('[Server Error] Critical processing breakdown on backend.');
          break;

        default:
          break;
      }
    } else if (error.request) {
      // The request was made but no response was received (Network Down)
      console.error('[Network Error] Gateway timeout. Please verify internet connection.');
    }

    return Promise.reject(error);
  }
);

export default api;