import api from './api';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getTickets: (params) => api.get('/admin/tickets', { params }),
  getTicketById: (id) => api.get(`/admin/tickets/${id}`),
  updateStatus: (id, status) => api.patch(`/admin/tickets/${id}/status`, { status }),
  updateCategory: (id, category) => api.patch(`/admin/tickets/${id}/category`, { category }),
  updatePriority: (id, priority) => api.patch(`/admin/tickets/${id}/priority`, { priority }),
  assignTicket: (id, assignedTo) => api.patch(`/admin/tickets/${id}/assign`, { assignedTo }),
  addNote: (id, body) => api.post(`/admin/tickets/${id}/notes`, { body }),
  getNotes: (id) => api.get(`/admin/tickets/${id}/notes`),
  addPublicMessage: (id, data) => api.post(`/admin/tickets/${id}/messages`, data),
  requestAiDraft: (id) => api.post(`/admin/tickets/${id}/ai/draft`),
  triggerAiClassify: (id) => api.post(`/admin/tickets/${id}/ai/classify`),
  getAuthors: () => api.get('/admin/authors'),
  getAuthorById: (id) => api.get(`/admin/authors/${id}`),
};
