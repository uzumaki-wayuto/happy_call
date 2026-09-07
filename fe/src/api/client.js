// src/api/client.js
import axios from 'axios';

const API_BASE =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => {
        localStorage.removeItem('token');
    },
    refresh: () => api.post('/auth/refresh'),
};

export const taskApi = {
    getTasks: (params) => api.get('/tasks', { params }),
    getTask: (id) => api.get(`/tasks/${id}`),
    createTask: (data) => api.post('/tasks', data),
    updateStatus: (id, status, agentId) =>
        api.put(`/tasks/${id}/status`, { status, agentId }),
    saveAttempt: (data) => api.post('/attempts', data),
    getAttemptsByTask: (taskId) => api.get(`/attempts/task/${taskId}`),
    getMyAttempts: (agentId, limit) =>
        api.get(`/attempts/agent/${agentId}`, { params: { limit } }),
    getMyTasks: (params) => {
        // ✅ Ensure agentId is always included
        const safeParams = {...params };
        if (!safeParams.agentId) {
            console.warn('⚠️ getMyTasks called without agentId');
        }
        return api.get(`/tasks`, { params: safeParams });
    },
};

export default api;