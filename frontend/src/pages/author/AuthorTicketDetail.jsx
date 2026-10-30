import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Textarea } from '../../components/common/Input';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import {
  ArrowLeft,
  Send,
  User,
  Shield,
  Clock,
  BookOpen,
  Calendar,
  AlertCircle,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';

export const AuthorTicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);

  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Fetch ticket details
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await ticketService.getMyTicketById(id);
        if (res.success && res.data) {
          setTicket(res.data.ticket);
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        addToast({ type: 'error', message: err.message || 'Ticket not found' });
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, addToast]);

  // Join Socket ticket room & listen to real-time events
  useEffect(() => {
    if (!id) return;
    joinTicketRoom(id);

    if (socket) {
      const handleNewMessage = (newMsg) => {
        setMessages((prev) => {
          // Deduplicate
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };

      const handleStatusChanged = ({ status }) => {
        setTicket((prev) => (prev ? { ...prev, status } : prev));
      };

      const handleClassified = (updated) => {
        if (updated._id === id) {
          setTicket((prev) => ({ ...prev, ...updated }));
        }
      };

      socket.on('ticket:message', handleNewMessage);
      socket.on('ticket:status_changed', handleStatusChanged);
      socket.on('ticket:classified', handleClassified);

      return () => {
        leaveTicketRoom(id);
        socket.off('ticket:message', handleNewMessage);
        socket.off('ticket:status_changed', handleStatusChanged);
        socket.off('ticket:classified', handleClassified);
      };
    }
  }, [id, socket, joinTicketRoom, leaveTicketRoom]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    try {
      setSending(true);
      const res = await ticketService.addMessage(id, { body: replyBody.trim() });
      if (res.success && res.data?.message) {
        setReplyBody('');
        if (res.data.ticketStatus) {
          setTicket((prev) => ({ ...prev, status: res.data.ticketStatus }));
        }
        addToast({ type: 'success', message: 'Reply sent successfully' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to send reply' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-paper-200">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-serif text-lg font-bold">Ticket Not Found</h3>
        <p className="text-sm text-ink-500 mt-1">
          This support query does not exist or you do not have permission to access it.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/author/tickets')}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/author/tickets')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-ink-600 hover:text-brand transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Tickets</span>
        </button>

        <div className="flex items-center gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
      </div>

      {/* Ticket Header Dossier */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5 border-b border-paper-200">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-mono text-sm font-bold text-brand bg-brand-light px-2.5 py-0.5 rounded">
                  {ticket.ticketNumber}
                </span>
                <CategoryBadge category={ticket.category} />
              </div>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink-950 tracking-tight">
                {ticket.subject}
              </h1>
            </div>

            <div className="text-right text-xs text-ink-500 space-y-1 shrink-0">
              <p>
                Created:{' '}
                <span className="font-medium text-ink-800">
                  {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </p>
              {ticket.assignedTo && (
                <p>
                  Handled by: <span className="font-medium text-ink-800">{ticket.assignedTo.name}</span>
                </p>
              )}
            </div>
          </div>

          {/* Book Context Banner */}
          {ticket.bookId && (
            <div className="mt-4 p-3.5 bg-paper-50 rounded-xl border border-paper-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-ink-800">
                <BookOpen className="w-4 h-4 text-brand" />
                <span className="font-semibold">{ticket.bookId.title}</span>
                <span className="text-ink-400 font-mono">({ticket.bookId.isbn || 'No ISBN'})</span>
              </div>
              <div className="flex items-center gap-3 text-ink-600">
                <span>Status: <strong className="text-ink-800">{ticket.bookId.status}</strong></span>
                {ticket.bookId.mrp && <span>MRP: <strong>₹{ticket.bookId.mrp}</strong></span>}
                <span>Sold: <strong>{ticket.bookId.total_copies_sold || 0}</strong></span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {/* Original Query (Initial Post) */}
        <div className="bg-white rounded-xl border border-paper-200/90 shadow-2xs overflow-hidden">
          <div className="px-6 py-4 bg-paper-100/60 border-b border-paper-200 flex items-center justify-between text-xs text-ink-600">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center font-bold text-[10px]">
                {ticket.authorId?.name?.charAt(0) || 'A'}
              </div>
              <span className="font-semibold text-ink-900">{ticket.authorId?.name} (You)</span>
              <span className="text-ink-400">raised this support inquiry</span>
            </div>
            <span>
              {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="p-6">
            <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-paper-200 space-y-1.5">
                <span className="text-xs font-semibold text-ink-500 block">Attached Files:</span>
                <div className="flex flex-wrap gap-2">
                  {ticket.attachments.map((att, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-lg bg-paper-100 border border-paper-200 text-xs text-ink-800 flex items-center gap-1.5"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-brand" />
                      <span>{att.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message Thread (Admin & Author responses) */}
        {messages.map((msg) => {
          const isAdmin = msg.senderRole === 'admin';

          return (
            <div
              key={msg._id}
              className={`rounded-xl border shadow-2xs overflow-hidden ${
                isAdmin
                  ? 'bg-paper-50 border-ink-200 ml-4 sm:ml-8'
                  : 'bg-white border-paper-200 mr-4 sm:mr-8'
              }`}
            >
              <div
                className={`px-6 py-3 border-b flex items-center justify-between text-xs ${
                  isAdmin
                    ? 'bg-ink-900 text-white border-ink-800'
                    : 'bg-paper-100/70 text-ink-600 border-paper-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center font-bold text-[10px]">
                      <Shield className="w-3 h-3" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-ink-700 text-white flex items-center justify-center font-bold text-[10px]">
                      {msg.senderName?.charAt(0) || 'A'}
                    </div>
                  )}
                  <span className={`font-semibold ${isAdmin ? 'text-white' : 'text-ink-900'}`}>
                    {isAdmin ? 'BookLeaf Publishing Support' : `${msg.senderName} (You)`}
                  </span>
                  <span className={isAdmin ? 'text-ink-300' : 'text-ink-400'}>
                    {isAdmin ? 'Official Response' : 'Author Follow-up'}
                  </span>
                </div>
                <span className={isAdmin ? 'text-ink-300' : 'text-ink-400'}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="p-6">
                <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{msg.body}</p>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input Box */}
      {ticket.status === 'Closed' ? (
        <div className="p-6 bg-paper-100 rounded-xl border border-paper-200 text-center text-sm text-ink-600">
          This ticket has been marked as <strong>Closed</strong> and cannot receive new replies. If you have any further questions, please raise a new ticket.
        </div>
      ) : (
        <Card>
          <CardBody className="p-6">
            <form onSubmit={handleSendReply} className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-700">Send Follow-up Message</label>
                {ticket.status === 'Resolved' && (
                  <span className="text-[11px] text-amber-800 bg-amber-light px-2 py-0.5 rounded font-medium">
                    Note: Replying will reopen this ticket to In Progress
                  </span>
                )}
              </div>

              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={3}
                placeholder="Write your follow-up reply or share further details with the support team..."
                required
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={sending}
                  icon={Send}
                >
                  Send Reply
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
