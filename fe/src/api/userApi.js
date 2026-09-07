// src/api/userApi.js
import api from './client';

export const userApi = {
    getUsers: (params) => api.get('/users', { params }),
    getUser: (id) => api.get(`/users/${id}`),
    createUser: (data) => api.post('/users', data),
    updateUser: (id, data) => api.put(`/users/${id}`, data),
    deactivateUser: (id) => api.delete(`/users/${id}`),
    changePassword: (id, newPassword) =>
        api.post(`/users/${id}/password`, { newPassword }),
};

export default userApi;