import { Ticket } from '../models/Ticket.js';
import { Author } from '../models/Author.js';
import { Book } from '../models/Book.js';
import { Message } from '../models/Message.js';
import { InternalNote } from '../models/InternalNote.js';
import { User } from '../models/User.js';
import { classifyAndPrioritize, generateDraftResponse } from '../ai/aiService.js';
import {
  emitTicketStatusChanged,
  emitTicketAssigned,
  emitTicketUpdated,
  emitTicketMessage,
  emitInternalNote,
  emitTicketClassified,
} from '../sockets/socketServer.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [totalAuthors, totalBooks, totalTickets, tickets] = await Promise.all([
      Author.countDocuments(),
      Book.countDocuments(),
      Ticket.countDocuments(),
      Ticket.find({}),
    ]);

    const statusCounts = {
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
      Closed: 0,
    };

    const priorityCounts = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };

    const categoryCounts = {};

    let responseTimeSumMs = 0;
    let responseTimeCount = 0;

    for (const t of tickets) {
      if (statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
      if (priorityCounts[t.priority] !== undefined) {
        priorityCounts[t.priority]++;
      }
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;

      if (t.firstAdminResponseAt && t.createdAt) {
        const diffMs = new Date(t.firstAdminResponseAt).getTime() - new Date(t.createdAt).getTime();
        if (diffMs > 0) {
          responseTimeSumMs += diffMs;
          responseTimeCount++;
        }
      }
    }

    let averageFirstResponseMinutes = null;
    let averageFirstResponseFormatted = null;
    if (responseTimeCount > 0) {
      averageFirstResponseMinutes = Math.round(responseTimeSumMs / responseTimeCount / 60000);
      if (averageFirstResponseMinutes < 60) {
        averageFirstResponseFormatted = `${averageFirstResponseMinutes}m`;
      } else {
        const hours = (averageFirstResponseMinutes / 60).toFixed(1);
        averageFirstResponseFormatted = `${hours}h`;
      }
    }

    return successResponse(res, {
      totals: {
        authors: totalAuthors,
        books: totalBooks,
        tickets: totalTickets,
      },
      statusCounts,
      priorityCounts,
      categoryCounts,
      metrics: {
        averageFirstResponseMinutes,
        averageFirstResponseFormatted,
        respondedTicketsCount: responseTimeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminTickets = async (req, res, next) => {
  try {
    const {
      status,
      category,
      priority,
      assignedTo,
      authorId,
      search,
      sortBy = 'urgency',
      page = 1,
      limit = 15,
    } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }
    if (authorId) {
      query.authorId = authorId;
    }
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query.assignedTo = null;
      } else if (assignedTo === 'me') {
        query.assignedTo = req.userId;
      } else {
        query.assignedTo = assignedTo;
      }
    }

    if (search && search.trim().length > 0) {
      const s = search.trim();
      query.$or = [
        { ticketNumber: { $regex: s, $options: 'i' } },
        { subject: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ];
    }

    // Sort strategy
    let sortObj = {};
    if (sortBy === 'urgency') {
      // Urgent unresolved first
      sortObj = {
        status: 1, // 'Open' & 'In Progress' precede 'Resolved' & 'Closed'
        createdAt: 1, // Oldest first
      };
    } else if (sortBy === 'newest') {
      sortObj = { createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sortObj = { createdAt: 1 };
    } else if (sortBy === 'lastMessage') {
      sortObj = { lastMessageAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, totalCount] = await Promise.all([
      Ticket.find(query)
        .populate('authorId', 'name email city author_id')
        .populate('bookId', 'title isbn status')
        .populate('assignedTo', 'name email')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(query),
    ]);

    // Secondary client-like priority sort for urgency view if needed
    let sortedTickets = tickets;
    if (sortBy === 'urgency') {
      const priorityWeights = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const statusWeights = { Open: 3, 'In Progress': 2, Resolved: 1, Closed: 0 };

      sortedTickets = [...tickets].sort((a, b) => {
        const sDiff = (statusWeights[b.status] || 0) - (statusWeights[a.status] || 0);
        if (sDiff !== 0) return sDiff;
        const pDiff = (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
        if (pDiff !== 0) return pDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    return successResponse(
      res,
      { tickets: sortedTickets },
      200,
      {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('authorId', 'name email city author_id phone joined_date')
      .populate('bookId')
      .populate('assignedTo', 'name email');

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const [messages, internalNotes] = await Promise.all([
      Message.find({ ticketId: ticket._id }).sort({ createdAt: 1 }),
      InternalNote.find({ ticketId: ticket._id }).sort({ createdAt: 1 }),
    ]);

    return successResponse(res, { ticket, messages, internalNotes });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    ticket.status = status;
    if (status === 'Resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }
    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email');

    emitTicketStatusChanged(ticket._id.toString(), status, updated);

    return successResponse(res, { ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const updateTicketCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    ticket.category = category;
    ticket.classificationSource = 'manual'; // Override flag
    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email');

    emitTicketUpdated(updated);

    return successResponse(res, { ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const updateTicketPriority = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    ticket.priority = priority;
    ticket.classificationSource = 'manual'; // Override flag
    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email');

    emitTicketUpdated(updated);

    return successResponse(res, { ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { assignedTo } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (assignedTo === 'me') {
      assignedTo = req.userId;
    }

    if (assignedTo) {
      const user = await User.findById(assignedTo);
      if (!user || user.role !== 'admin') {
        return errorResponse(res, 'Invalid assignee (must be an active admin)', 400, 'INVALID_ASSIGNEE');
      }
      ticket.assignedTo = user._id;
    } else {
      ticket.assignedTo = null;
    }

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email');

    emitTicketAssigned(ticket._id.toString(), ticket.assignedTo, updated);

    return successResponse(res, { ticket: updated });
  } catch (error) {
    next(error);
  }
};

export const addAdminInternalNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const note = await InternalNote.create({
      ticketId: ticket._id,
      adminId: req.userId,
      adminName: req.user.name,
      body,
    });

    // Internal note emitted ONLY to admin room!
    emitInternalNote(ticket._id.toString(), note);

    return successResponse(res, { note }, 201);
  } catch (error) {
    next(error);
  }
};

export const getAdminInternalNotes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notes = await InternalNote.find({ ticketId: id }).sort({ createdAt: 1 });
    return successResponse(res, { notes });
  } catch (error) {
    next(error);
  }
};

export const addAdminPublicMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { body, attachments } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    if (!ticket.firstAdminResponseAt) {
      ticket.firstAdminResponseAt = new Date();
    }

    ticket.lastMessageAt = new Date();
    await ticket.save();

    const message = await Message.create({
      ticketId: ticket._id,
      senderId: req.userId,
      senderRole: 'admin',
      senderName: req.user.name,
      body,
      attachments: attachments || [],
    });

    // Emit to ticket room (author sees message in real time!)
    emitTicketMessage(ticket._id.toString(), message);
    emitTicketStatusChanged(ticket._id.toString(), ticket.status, ticket);

    return successResponse(res, { message, ticketStatus: ticket.status }, 201);
  } catch (error) {
    next(error);
  }
};

export const requestAiDraft = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('authorId')
      .populate('bookId');

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const recentMessages = await Message.find({ ticketId: ticket._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const lastMessageId = recentMessages.length > 0 ? recentMessages[0]._id.toString() : 'initial';

    const result = await generateDraftResponse({
      ticketId: ticket._id.toString(),
      lastMessageId,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      bookContext: ticket.bookId,
      authorContext: ticket.authorId,
      recentMessages: recentMessages.reverse(),
    });

    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const triggerAiClassification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate('authorId')
      .populate('bookId');

    if (!ticket) {
      return errorResponse(res, 'Ticket not found', 404, 'TICKET_NOT_FOUND');
    }

    const aiResult = await classifyAndPrioritize({
      subject: ticket.subject,
      description: ticket.description,
      bookContext: ticket.bookId,
      authorContext: ticket.authorId,
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
        reasoning: aiResult.reason || 'Classification re-run failed',
        timestamp: new Date(),
      };
    }

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('authorId', 'name email city author_id')
      .populate('bookId', 'title isbn status')
      .populate('assignedTo', 'name email');

    emitTicketClassified(updated);

    return successResponse(res, { ticket: updated, result: aiResult });
  } catch (error) {
    next(error);
  }
};

export const getAdminAuthors = async (req, res, next) => {
  try {
    const authors = await Author.find({}).populate('books').sort({ joined_date: -1 });
    return successResponse(res, { authors });
  } catch (error) {
    next(error);
  }
};

export const getAdminAuthorById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const author = await Author.findById(id).populate('books');
    if (!author) {
      return errorResponse(res, 'Author not found', 404, 'AUTHOR_NOT_FOUND');
    }

    const tickets = await Ticket.find({ authorId: author._id }).sort({ createdAt: -1 });

    return successResponse(res, { author, tickets });
  } catch (error) {
    next(error);
  }
};
