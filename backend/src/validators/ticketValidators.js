import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../models/Ticket.js';

export const createTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject is too long').trim(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description is too long').trim(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
});

export const addMessageSchema = z.object({
  body: z.string().min(1, 'Message body cannot be empty').max(5000, 'Message is too long').trim(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        size: z.number(),
        type: z.string(),
        url: z.string().optional().default(''),
      })
    )
    .optional()
    .default([]),
});

export const addNoteSchema = z.object({
  body: z.string().min(1, 'Note content cannot be empty').max(5000, 'Note is too long').trim(),
});

export const updateStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${TICKET_STATUSES.join(', ')}` }),
  }),
});

export const updateCategorySchema = z.object({
  category: z.enum(TICKET_CATEGORIES, {
    errorMap: () => ({ message: `Category must be one of: ${TICKET_CATEGORIES.join(', ')}` }),
  }),
});

export const updatePrioritySchema = z.object({
  priority: z.enum(TICKET_PRIORITIES, {
    errorMap: () => ({ message: `Priority must be one of: ${TICKET_PRIORITIES.join(', ')}` }),
  }),
});

export const assignTicketSchema = z.object({
  assignedTo: z.string().nullable(),
});
