import axiosClient from './axiosClient';

export const authApi = {
  findUser: (username, password) =>
    axiosClient.get('/users', { params: { username, password } }),
};
