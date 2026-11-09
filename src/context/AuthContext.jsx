import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { login as loginService } from '../services/authService';

const STORAGE_KEY = 'rental-manager-user';
const AuthContext = createContext(null);

function readStoredUser() {
  const storedUser = sessionStorage.getItem(STORAGE_KEY);
  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    if (user && user.id != null && user.username && user.fullName) return user;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback(async (username, password) => {
    const authenticatedUser = await loginService(username, password);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser));
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}
