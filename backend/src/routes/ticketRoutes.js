import express from 'express';
import {
  createTicket,
  getMyTickets,
  getMyTicketById,
  addAuthorMessage,
} from '../controllers/ticketController.js';
import { authenticate, requireRole, validate } from '../middleware/auth.js';
import { createTicketSchema, addMessageSchema } from '../validators/ticketValidators.js';

const router = express.Router();

// Author Ticket routes require authentication and 'author' role
router.use(authenticate, requireRole('author'));

router.post('/', validate(createTicketSchema), createTicket);
router.get('/', getMyTickets);
router.get('/:id', getMyTicketById);
router.post('/:id/messages', validate(addMessageSchema), addAuthorMessage);

export default router;
