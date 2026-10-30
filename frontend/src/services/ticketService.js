import api from './api';

export const ticketService = {
  createTicket: (data) => api.post('/tickets', data),
  getMyTickets: () => api.get('/tickets'),
  getMyTicketById: (id) => api.get(`/tickets/${id}`),
  addMessage: (id, data) => api.post(`/tickets/${id}/messages`, data),
};
