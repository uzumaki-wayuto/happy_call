// src/api/pbxApi.js
import api from './client';

export const pbxApi = {
    // Get PBX status
    getStatus: () => api.get('/pbx/status'),

    // Click-to-Call
    clickToCall: (data) => api.post('/pbx/call', data),

    // Manual dial
    manualDial: (data) => api.post('/pbx/manual', data),

    // Get call status
    getCallStatus: (callId) => api.get(`/pbx/call/${callId}`),
};

export default pbxApi;