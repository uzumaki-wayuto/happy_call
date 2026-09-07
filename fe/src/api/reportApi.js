// fe/src/api/reportApi.js
import api from './client';

export const reportApi = {
    getAgentPerformance: (params) => api.get('/reports/agent-performance', { params }),
    getTrendData: (params) => api.get('/reports/trend', { params }),
    getResultDistribution: (params) => api.get('/reports/distribution', { params }),
};

export default reportApi;