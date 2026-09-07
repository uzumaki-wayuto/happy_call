// fe/src/api/dashboardApi.js
import api from './client';

export const dashboardApi = {
    // Admin Dashboard
    getAdminStats: () => api.get('/dashboard/admin/stats'),

    // Supervisor Dashboard
    getSupervisorStats: () => api.get('/dashboard/supervisor/stats'),

    // Agent Dashboard
    getAgentStats: (agentId) => api.get(`/dashboard/agent/${agentId}/stats`),

    // Get top branches
    getTopBranches: () => api.get('/dashboard/top-branches'),

    // Get system notices
    getSystemNotices: () => api.get('/dashboard/notices'),

    getExceptionByType: () => api.get('/dashboard/exception-by-type'),
    getCriticalExceptions: () => api.get('/dashboard/critical-exceptions'),
};

export default dashboardApi;