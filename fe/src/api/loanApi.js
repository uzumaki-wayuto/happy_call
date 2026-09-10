// src/api/loanApi.js
import api from './client';

export const loanApi = {
    // Get all loans with optional filters
    getLoans: (params) => api.get('/loans', { params }),

    // Get loan by ID
    getLoan: (id) => api.get(`/loans/${id}`),

    // Create loan
    createLoan: (data) => api.post('/loans', data),

    // Update loan
    updateLoan: (id, data) => api.put(`/loans/${id}`, data),

    // Assign loan to campaign
    assignToCampaign: (loanId, campaignId) =>
        api.put(`/loans/${loanId}/campaign`, { campaignId }),

    // Bulk assign loans to campaign
    bulkAssignToCampaign: (loanIds, campaignId) =>
        api.post('/loans/bulk-assign', { loanIds, campaignId }),

    // Get unassigned loans (no campaign)
    getUnassignedLoans: (params) =>
        api.get('/loans/unassigned', { params }),

    // Get loans by campaign
    getLoansByCampaign: (campaignId, params) =>
        api.get(`/campaigns/${campaignId}/loans`, { params }),
};

export default loanApi;