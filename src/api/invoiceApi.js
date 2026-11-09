import axiosClient from './axiosClient';

export const invoiceApi = {
  getAll: (params) => axiosClient.get('/invoices', { params }),
  getById: (id) => axiosClient.get(`/invoices/${id}`),
  create: (data) => axiosClient.post('/invoices', data),
  update: (id, data) => axiosClient.put(`/invoices/${id}`, data),
  patch: (id, data) => axiosClient.patch(`/invoices/${id}`, data),
  remove: (id) => axiosClient.delete(`/invoices/${id}`),
};
