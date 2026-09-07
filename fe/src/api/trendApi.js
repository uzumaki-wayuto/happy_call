// fe/src/api/trendApi.js
import api from './client';

export const trendApi = {
    // Get global trend data (all agents combined)
    getGlobalTrend: (params) => api.get('/reports/trend', { params }),

    // Get trend data for a specific agent
    getAgentTrend: (agentId, params) =>
        api.get(`/reports/trend/agent/${agentId}`, { params }),

    // Get agent performance data
    getAgentPerformance: (params) =>
        api.get('/reports/agent-performance', { params }),
};

export default trendApi;