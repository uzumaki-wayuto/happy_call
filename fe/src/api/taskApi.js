// src/api/taskApi.js
import api from './client';

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

export default taskApi;