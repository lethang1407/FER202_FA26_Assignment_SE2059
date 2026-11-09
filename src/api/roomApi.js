import axiosClient from './axiosClient';

export const roomApi = {
  getAll: (params) => axiosClient.get('/rooms', { params }),
  getById: (id) => axiosClient.get(`/rooms/${id}`),
  create: (data) => axiosClient.post('/rooms', data),
  update: (id, data) => axiosClient.put(`/rooms/${id}`, data),
  patch: (id, data) => axiosClient.patch(`/rooms/${id}`, data),
  remove: (id) => axiosClient.delete(`/rooms/${id}`),
};
