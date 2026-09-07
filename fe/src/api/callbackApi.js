// fe/src/api/callbackApi.js
import api from './client';

export const callbackApi = {
    getCallbacks: (params) => api.get('/callbacks', { params }),
    createCallback: (data) => api.post('/callbacks', data),
    updateCallback: (id, data) => api.put(`/callbacks/${id}`, data),
    deleteCallback: (id) => api.delete(`/callbacks/${id}`),
};

export default callbackApi;