import axios from '../config/axios';

const api = {
    // Auth methods
    login: async (credentials) => {
        const response = await axios.post('/auth/login', credentials);
        const { token } = response.data;
        if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        return response.data;
    },

    logout: async () => {
        try {
            await axios.post('/auth/logout');
        } finally {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
        }
    },

    register: async (userData) => {
        const response = await axios.post('/auth/register', userData);
        return response.data;
    },

    // User methods
    getCurrentUser: async () => {
        const token = localStorage.getItem('token');
        if (!token) return null;

        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const response = await axios.get('/users/profile');
            return response.data;
        } catch (error) {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            return null;
        }
    },

    updateProfile: async (userData) => {
        const response = await axios.put('/users/profile', userData);
        return response.data;
    },

    // Helper methods
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getToken: () => {
        return localStorage.getItem('token');
    },

    setAuthHeader: (token) => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    },

    // Initialize auth state from localStorage
    initializeAuth: () => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }
};

export default api;