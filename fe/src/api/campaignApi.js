// src/api/campaignApi.js
import api from './client';

export const campaignApi = {
    // Get all campaigns
    getCampaigns: (params) => api.get('/campaigns', { params }),

    // Get campaign by ID
    getCampaign: (id) => api.get(`/campaigns/${id}`),

    // Create campaign (Admin only)
    createCampaign: (data) => api.post('/campaigns', data),

    // Update campaign (Admin only)
    updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),

    // Delete campaign (Admin only)
    deleteCampaign: (id) => api.delete(`/campaigns/${id}`),

    // Upload target list (Admin only)
    uploadTargetList: (data) =>
        api.post('/campaigns/upload', data, {
            headers: { 'Content-Type': 'application/json' },
        }),
};

export default campaignApi;