import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';

let ioInstance = null;

export function initSocketServer(httpServer, clientUrl) {
  const allowedOrigins = clientUrl ? clientUrl.split(',').map((url) => url.trim()) : ['http://localhost:5173'];

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  // Authentication Middleware for Handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Socket authentication error: Token missing'));
      }

      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        return next(new Error('Socket authentication error: Invalid or expired token'));
      }

      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return next(new Error('Socket authentication error: User inactive or not found'));
      }

      socket.user = {
        id: user._id.toString(),
        role: user.role,
        authorId: user.authorId ? user.authorId.toString() : null,
        name: user.name,
      };

      next();
    } catch (err) {
      next(new Error(`Socket authentication failed: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const { id, role, authorId } = socket.user;

    // Join personal user room
    socket.join(`user:${id}`);

    // If admin, join admins room
    if (role === 'admin') {
      socket.join('admins');
    }

    // Client requests to join a ticket room
    socket.on('ticket:join', async (ticketId) => {
      try {
        if (!ticketId) return;

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
          socket.emit('error', { message: 'Ticket not found' });
          return;
        }

        // Authorization check: Admin OR the owning author
        const isOwner = role === 'author' && authorId && ticket.authorId.toString() === authorId;
        const isAdmin = role === 'admin';

        if (isAdmin || isOwner) {
          socket.join(`ticket:${ticketId}`);
        } else {
          socket.emit('error', { message: 'Unauthorized to join ticket updates' });
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // Client requests to leave a ticket room
    socket.on('ticket:leave', (ticketId) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  ioInstance = io;
  return io;
}

export function getIO() {
  return ioInstance;
}

// Realtime Helper Dispatchers (safe to call even if socket server is optional/uninitialized)
export function emitTicketCreated(ticket) {
  if (!ioInstance) return;
  ioInstance.to('admins').emit('ticket:created', ticket);
}

export function emitTicketClassified(ticket) {
  if (!ioInstance) return;
  // Emit to admins
  ioInstance.to('admins').emit('ticket:classified', ticket);
  // Emit to specific author user
  if (ticket.authorUser) {
    ioInstance.to(`user:${ticket.authorUser}`).emit('ticket:classified', ticket);
  }
}

export function emitTicketMessage(ticketId, message) {
  if (!ioInstance) return;
  // Message is public, send to ticket room
  ioInstance.to(`ticket:${ticketId}`).emit('ticket:message', message);
}

export function emitInternalNote(ticketId, note) {
  if (!ioInstance) return;
  // Private internal note: ONLY to admins room! NEVER to ticket room or author!
  ioInstance.to('admins').emit('ticket:note', { ticketId, note });
}

export function emitTicketUpdated(ticket) {
  if (!ioInstance) return;
  ioInstance.to(`ticket:${ticket._id}`).emit('ticket:updated', ticket);
  ioInstance.to('admins').emit('ticket:updated', ticket);
}

export function emitTicketStatusChanged(ticketId, status, updatedTicket) {
  if (!ioInstance) return;
  ioInstance.to(`ticket:${ticketId}`).emit('ticket:status_changed', { ticketId, status, ticket: updatedTicket });
  ioInstance.to('admins').emit('ticket:status_changed', { ticketId, status, ticket: updatedTicket });
}

export function emitTicketAssigned(ticketId, assignedTo, updatedTicket) {
  if (!ioInstance) return;
  ioInstance.to('admins').emit('ticket:assigned', { ticketId, assignedTo, ticket: updatedTicket });
  ioInstance.to(`ticket:${ticketId}`).emit('ticket:assigned', { ticketId, assignedTo, ticket: updatedTicket });
}
