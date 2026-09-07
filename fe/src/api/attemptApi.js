// src/api/attemptApi.js
import api from './client';

export const attemptApi = {
    getMyAttempts: (agentId, params) => {
        // ✅ Check if params exists before spreading
        const safeParams = params ? {...params } : {};

        // ✅ Ensure limit is a valid integer if it exists
        if (safeParams.limit) {
            safeParams.limit = parseInt(safeParams.limit) || 50;
        }

        return api.get(`/attempts/agent/${agentId}`, { params: safeParams });
    },

    getAttemptsByTask: (taskId) =>
        api.get(`/attempts/task/${taskId}`),
};

export default attemptApi;