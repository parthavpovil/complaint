import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:8080/api/v1';

// Create an axios instance for authenticated requests
const authAxios = axios.create();

// Add authorization header to all authenticated requests
authAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const authService = {
    login: async (email, password) => {
        try {
            console.log('Attempting login with:', { email });
            const response = await axios.post(`${API_URL}/login`, {
                email,
                password
            });
            console.log('Login response:', response.data);
            
            // Decode the JWT token to get user information
            const decodedToken = jwtDecode(response.data.token);
            
            // Create a user object combining token data and response data
            const user = {
                id: decodedToken.user_id,
                role: decodedToken.role,
                email: response.data.user.email,
                name: response.data.user.name
            };
            
            // Store the complete user data in localStorage
            localStorage.setItem('user', JSON.stringify(user));
            
            return {
                token: response.data.token,
                user: user
            };
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    register: async (userData) => {
        try {
            const response = await axios.post(`${API_URL}/register`, userData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Add function to get the current user from localStorage
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    getAllUsers: async () => {
        try {
            const response = await authAxios.get(`${API_URL}/admin/users`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getAllOfficials: async () => {
        try {
            const response = await authAxios.get(`${API_URL}/admin/officials`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    updateUserRole: async (userId, role) => {
        try {
            const response = await authAxios.post(`${API_URL}/admin/users/${userId}/role`, {
                role: "official" // Backend only allows setting role to "official"
            });
            return response.data;
        } catch (error) {
            if (error.response?.status === 400) {
                throw new Error("Cannot update to this role. Only 'official' role is allowed.");
            }
            throw error.response?.data || error.message;
        }
    },
};