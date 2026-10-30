import api from './api';

export const authService = {
  login: async (email, password) => {
    return api.post('/auth/login', { email, password });
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('bookleaf_token');
      localStorage.removeItem('bookleaf_user');
    }
  },
  getMe: async () => {
    return api.get('/auth/me');
  },
};
