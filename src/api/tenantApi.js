import axiosClient from './axiosClient';

export const tenantApi = {
  getAll: (params) => axiosClient.get('/tenants', { params }),
  getById: (id) => axiosClient.get(`/tenants/${id}`),
  create: (data) => axiosClient.post('/tenants', data),
  update: (id, data) => axiosClient.put(`/tenants/${id}`, data),
  patch: (id, data) => axiosClient.patch(`/tenants/${id}`, data),
  remove: (id) => axiosClient.delete(`/tenants/${id}`),
};
