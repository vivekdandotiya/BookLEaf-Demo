import { Ticket } from '../models/Ticket.js';
import { Book } from '../models/Book.js';
import { Author } from '../models/Author.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { getNextTicketNumber } from '../models/Counter.js';
import { classifyAndPrioritize } from '../ai/aiService.js';
import {
  emitTicketCreated,
  emitTicketClassified,
  emitTicketMessage,
  emitTicketStatusChanged,
} from '../sockets/socketServer.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const createTicket = async (req, res, next) => {
  try {
    const { bookId, subject, description, attachments } = req.body;

    let bookDoc = null;
    if (bookId) {
      bookDoc = await Book.findOne({ _id: bookId, authorId: req.authorId });
      if (!bookDoc) {
        return errorResponse(res, 'The selected book was not found or does not belong to your account', 400, 'INVALID_BOOK');
      }
    }

    const ticketNumber = await getNextTicketNumber();

    const ticket = await Ticket.create({
      ticketNumber,
      authorId: req.authorId,
      author_id: req.author_id || req.user.author_id,
      bookId: bookDoc ? bookDoc._id : null,
      subject,
      description,
      attachments: attachments || [],
      status: 'Open',
      classificationSource: 'pending',
      aiStatus: 'pending',
      lastMessageAt: new Date(),
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status mrp total_copies_sold total_royalty_earned royalty_paid royalty_pending');

    // Notify connected admins via socket immediately
    emitTicketCreated(populatedTicket);

    // Respond to author immediately without blocking
    successResponse(res, { ticket: populatedTicket }, 201);

    // Asynchronous background AI Classification & Priority calculation
    (async () => {
      try {
        const authorDoc = await Author.findById(req.authorId);
        const aiResult = await classifyAndPrioritize({
          subject,
          description,
          bookContext: bookDoc,
          authorContext: authorDoc,
        });

        if (aiResult.success) {
          ticket.category = aiResult.data.category;
          ticket.priority = aiResult.data.priority;
          ticket.classificationSource = 'ai';
          ticket.aiStatus = 'success';
          ticket.aiMeta = {
            confidence: aiResult.data.confidence,
            reasoning: aiResult.data.reasoning,
            model: aiResult.data.model,
            tokens: aiResult.data.tokens,
            timestamp: new Date(),
          };
        } else {
          ticket.aiStatus = 'failed';
          ticket.classificationSource = 'pending';
          ticket.aiMeta = {
            confidence: 0,
            reasoning: aiResult.reason || 'AI classification failed',
            timestamp: new Date(),
          };
        }

        await ticket.save();

        const updatedDoc = await Ticket.findById(ticket._id)
          .populate('authorId', 'name email city author_id')
          .populate('bookId', 'title isbn status');

        // Look up author's user ID for socket notification
        const authorUser = await User.findOne({ authorId: req.authorId });
        updatedDoc.authorUser = authorUser ? authorUser._id.toString() : null;

        emitTicketClassified(updatedDoc);
      } catch (bgErr) {
        console.error('[Ticket Background AI Error]:', bgErr);
        ticket.aiStatus = 'failed';
        await ticket.save().catch(() => {});
      }
    })();
  } catch (error) {
    next(error);
  }
};

export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ authorId: req.authorId })
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    return successResponse(res, { tickets });
  } catch (error) {
    next(error);
  }
};

export const getMyTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findOne({ _id: id, authorId: req.authorId })
      .populate('bookId', 'title isbn status mrp total_copies_sold total_royalty_earned royalty_paid royalty_pending')
      .populate('authorId', 'name email city author_id phone joined_date')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      // 404 rather than 403 to prevent enumeration attacks
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    // Public messages only (Internal notes strictly excluded)
    const messages = await Message.find({ ticketId: ticket._id }).sort({ createdAt: 1 });

    return successResponse(res, { ticket, messages });
  } catch (error) {
    next(error);
  }
};

export const addAuthorMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body, attachments } = req.body;

    const ticket = await Ticket.findOne({ _id: id, authorId: req.authorId });
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.status === 'Closed') {
      return errorResponse(
        res,
        'This ticket is closed and no longer accepts messages. Please raise a new ticket if you need further help.',
        400,
        'TICKET_CLOSED'
      );
    }

    let statusReopened = false;
    if (ticket.status === 'Resolved') {
      ticket.status = 'In Progress';
      statusReopened = true;
    }

    ticket.lastMessageAt = new Date();
    await ticket.save();

    const message = await Message.create({
      ticketId: ticket._id,
      senderId: req.userId,
      senderRole: 'author',
      senderName: req.user.name,
      body,
      attachments: attachments || [],
    });

    // Broadcast message to ticket room
    emitTicketMessage(ticket._id.toString(), message);

    if (statusReopened) {
      emitTicketStatusChanged(ticket._id.toString(), ticket.status, ticket);
    }

    return successResponse(res, { message, ticketStatus: ticket.status }, 201);
  } catch (error) {
    next(error);
  }
};
