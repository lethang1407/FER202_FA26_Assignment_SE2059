import axios from 'axios';
import { AppError } from '../utils/AppError';

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:9999',
  timeout: 8000,
});

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (!error.response) {
      return Promise.reject(
        new AppError(
          'Không kết nối được máy chủ. Hãy kiểm tra json-server đã chạy ở cổng 9999 chưa'
        )
      );
    }

    if (error.response.status === 404) {
      return Promise.reject(
        new AppError('Không tìm thấy dữ liệu (có thể đã bị xóa ở nơi khác)')
      );
    }

    return Promise.reject(new AppError('Đã xảy ra lỗi, vui lòng thử lại'));
  }
);

export default axiosClient;
