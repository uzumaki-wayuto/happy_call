// src/api/assignmentApi.js
import api from './client';

export const assignmentApi = {
    // Get agent workload summary
    getWorkload: (params) => api.get('/assignment/workload', { params }),

    // Get tasks by agent
    getAgentTasks: (agentId, params) =>
        api.get(`/assignment/agent/${agentId}/tasks`, { params }),

    // Get all tasks with agent info
    getTasksWithAgent: (params) => api.get('/assignment/tasks', { params }),

    // Get assignment summary
    getSummary: () => api.get('/assignment/summary'),

    // Get agent performance metrics
    getPerformance: (params) => api.get('/assignment/performance', { params }),
};

export default assignmentApi;