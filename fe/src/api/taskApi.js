// src/api/taskApi.js
import api from './client';

export const taskApi = {
    // ============ BASIC TASKS ============
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
        const safeParams = {...params };
        if (!safeParams.agentId) {
            console.warn('⚠️ getMyTasks called without agentId');
        }
        return api.get('/tasks', { params: safeParams });
    },

    // ============ ASSIGNMENT ============
    getUnassignedTasks: (params) => api.get('/tasks/unassigned', { params }),
    assignTasksToAgents: (data) => api.post('/tasks/assign', data),
    autoAssignPendingTasks: (taskType) =>
        api.post('/tasks/auto-assign', taskType ? { taskType } : {}),
    getAssignmentSuggestions: (taskId) =>
        api.post('/tasks/suggestions', { taskId }),
};

export default taskApi;