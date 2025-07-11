import axios from 'axios';

const API_URL = 'http://localhost:8080/api/v1';

// Create an axios instance with auth header
const complaintAxios = axios.create();

// Add authorization header to all requests
complaintAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const complaintService = {
    submitComplaint: async (complaintData) => {
        try {
            const response = await complaintAxios.post(`${API_URL}/complaints`, complaintData);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getMyComplaints: async () => {
        try {
            const response = await complaintAxios.get(`${API_URL}/complaints/my`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    getFilteredComplaints: async (filters) => {
        try {
            // Always use the filtered endpoint to maintain consistent response structure
            const params = new URLSearchParams();
            if (filters.district) params.append('district', filters.district);
            if (filters.category) params.append('category', filters.category);
            if (filters.status) params.append('status', filters.status);
            if (filters.userId) params.append('userid', filters.userId);

            const response = await complaintAxios.get(`${API_URL}/complaints?${params}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    }
};
