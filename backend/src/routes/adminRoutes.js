import express from 'express';
import {
  getAdminDashboard,
  getAdminTickets,
  getAdminTicketById,
  updateTicketStatus,
  updateTicketCategory,
  updateTicketPriority,
  assignTicket,
  addAdminInternalNote,
  getAdminInternalNotes,
  addAdminPublicMessage,
  requestAiDraft,
  triggerAiClassification,
  getAdminAuthors,
  getAdminAuthorById,
} from '../controllers/adminController.js';
import { authenticate, requireRole, validate } from '../middleware/auth.js';
import {
  updateStatusSchema,
  updateCategorySchema,
  updatePrioritySchema,
  assignTicketSchema,
  addNoteSchema,
  addMessageSchema,
} from '../validators/ticketValidators.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All admin routes require authentication and 'admin' role
router.use(authenticate, requireRole('admin'));

router.get('/dashboard', getAdminDashboard);
router.get('/tickets', getAdminTickets);
router.get('/tickets/:id', getAdminTicketById);

router.patch('/tickets/:id/status', validate(updateStatusSchema), updateTicketStatus);
router.patch('/tickets/:id/category', validate(updateCategorySchema), updateTicketCategory);
router.patch('/tickets/:id/priority', validate(updatePrioritySchema), updateTicketPriority);
router.patch('/tickets/:id/assign', validate(assignTicketSchema), assignTicket);

router.post('/tickets/:id/notes', validate(addNoteSchema), addAdminInternalNote);
router.get('/tickets/:id/notes', getAdminInternalNotes);

router.post('/tickets/:id/messages', validate(addMessageSchema), addAdminPublicMessage);

router.post('/tickets/:id/ai/draft', aiLimiter, requestAiDraft);
router.post('/tickets/:id/ai/classify', aiLimiter, triggerAiClassification);

router.get('/authors', getAdminAuthors);
router.get('/authors/:id', getAdminAuthorById);

export default router;
