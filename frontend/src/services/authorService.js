import api from './api';

export const authorService = {
  getProfile: () => api.get('/authors/me'),
  getDashboard: () => api.get('/authors/me/dashboard'),
  getBooks: () => api.get('/authors/me/books'),
  getBookById: (id) => api.get(`/authors/me/books/${id}`),
};
