import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bookleaf_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('bookleaf_token'));
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('bookleaf_token');
    if (savedToken) {
      try {
        const res = await authService.getMe();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('bookleaf_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        // Token invalid or expired
        localStorage.removeItem('bookleaf_token');
        localStorage.removeItem('bookleaf_user');
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('bookleaf_token', newToken);
      localStorage.setItem('bookleaf_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error('Login response missing token or user data');
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      // Ignore network errors during logout
    } finally {
      localStorage.removeItem('bookleaf_token');
      localStorage.removeItem('bookleaf_user');
      setUser(null);
      setToken(null);
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('bookleaf_user', JSON.stringify(res.data.user));
      }
    } catch (e) {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        isAuthor: user?.role === 'author',
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
