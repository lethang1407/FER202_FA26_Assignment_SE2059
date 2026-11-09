import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { authApi } from '../api/authApi';

jest.mock('../api/authApi', () => ({
  authApi: {
    findUser: jest.fn(),
  },
}));

describe('authentication and protected routes', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/rooms');
    authApi.findUser.mockReset();
  });

  test('redirects protected pages to login and returns to the requested page', async () => {
    authApi.findUser.mockResolvedValue([
      { id: 1, username: 'admin', password: '123456', fullName: 'Chủ nhà' },
    ]);

    const app = render(<App />);
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Tên đăng nhập'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(
      await screen.findByRole('heading', { name: 'Quản lý phòng' })
    ).toBeInTheDocument();
    expect(sessionStorage.getItem('rental-manager-user')).not.toContain('password');

    app.unmount();
    render(<App />);
    expect(
      await screen.findByRole('heading', { name: 'Quản lý phòng' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    expect(await screen.findByRole('heading', { name: 'Đăng nhập' })).toBeInTheDocument();
    expect(sessionStorage.getItem('rental-manager-user')).toBeNull();
  });

  test('shows an error for invalid credentials', async () => {
    authApi.findUser.mockResolvedValue([]);

    render(<App />);
    fireEvent.change(await screen.findByLabelText('Tên đăng nhập'), {
      target: { value: 'admin' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(
        screen.getByText('Tên đăng nhập hoặc mật khẩu không đúng')
      ).toBeInTheDocument();
    });
  });
});
