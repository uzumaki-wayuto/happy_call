// src/api/authApi.js
import api from './client';

export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => {
        localStorage.removeItem('token');
    },
    refresh: () => api.post('/auth/refresh'),
    getCurrentUser: () => api.get('/auth/me'),
};

export default authApi;