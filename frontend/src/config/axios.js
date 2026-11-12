import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create a public instance for non-authenticated routes
export const publicAxios = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

// Create an authenticated instance
const authAxios = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

// Add a request interceptor to include the token in all requests
authAxios.interceptors.request.use(
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

// Add a response interceptor to handle authentication errors
authAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and user data on authentication error
            localStorage.removeItem('token');
            delete authAxios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
    }
);

export default authAxios;
