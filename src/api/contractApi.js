import axiosClient from './axiosClient';

export const contractApi = {
  getAll: (params) => axiosClient.get('/contracts', { params }),
  getAllExpanded: () =>
    axiosClient.get('/contracts?_expand=room&_expand=tenant'),
  getById: (id) => axiosClient.get(`/contracts/${id}`),
  create: (data) => axiosClient.post('/contracts', data),
  update: (id, data) => axiosClient.put(`/contracts/${id}`, data),
  patch: (id, data) => axiosClient.patch(`/contracts/${id}`, data),
  remove: (id) => axiosClient.delete(`/contracts/${id}`),
};
