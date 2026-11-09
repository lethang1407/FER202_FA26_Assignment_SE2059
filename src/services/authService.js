import { authApi } from '../api/authApi';
import { AppError } from '../utils/AppError';

export async function login(username, password) {
  const users = await authApi.findUser(username.trim(), password);
  if (users.length === 0) {
    throw new AppError('Tên đăng nhập hoặc mật khẩu không đúng');
  }

  const { id, username: authenticatedUsername, fullName } = users[0];
  return { id, username: authenticatedUsername, fullName };
}
