import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Textarea } from '../../components/common/Input';
import { StatusBadge, PriorityBadge, CategoryBadge, BookStatusBadge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Lock,
  UserCheck,
  Tag,
  ShieldAlert,
  BookOpen,
  DollarSign,
  Calendar,
  Layers,
  MapPin,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

export const AdminTicketDetail = () => {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Composer States
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // AI Assistant States
  const [aiDraft, setAiDraft] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState(null);
  const [reclassifying, setReclassifying] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Active Tab for Right Sidebar (AI / Notes / Triage)
  const [activeTab, setActiveTab] = useState('ai');

  const { socket, joinTicketRoom, leaveTicketRoom } = useSocket();
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // 1. Fetch full ticket data
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await adminService.getTicketById(id);
        if (res.success && res.data) {
          setTicket(res.data.ticket);
          setMessages(res.data.messages || []);
          setInternalNotes(res.data.internalNotes || []);
          const existingDraft = res.data.ticket.suggestedResponse || res.data.ticket.aiMeta?.suggestedResponse;
          if (existingDraft) {
            setAiDraft(existingDraft);
          }
        }
      } catch (err) {
        addToast({ type: 'error', message: err.message || 'Failed to load ticket' });
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id, addToast]);

  // 2. Setup Real-time Sockets
  useEffect(() => {
    if (!id) return;
    joinTicketRoom(id);

    if (socket) {
      const handleNewMessage = (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };

      const handleNewNote = ({ ticketId, note }) => {
        if (ticketId === id) {
          setInternalNotes((prev) => [...prev, note]);
        }
      };

      const handleStatusChanged = ({ ticketId, status }) => {
        if (ticketId === id) {
          setTicket((prev) => (prev ? { ...prev, status } : prev));
        }
      };

      const handleAssigned = ({ ticketId, assignedTo }) => {
        if (ticketId === id) {
          setTicket((prev) => (prev ? { ...prev, assignedTo } : prev));
        }
      };

      const handleUpdated = (updated) => {
        if (updated._id === id) {
          setTicket((prev) => ({ ...prev, ...updated }));
          const existingDraft = updated.suggestedResponse || updated.aiMeta?.suggestedResponse;
          if (existingDraft) {
            setAiDraft(existingDraft);
          }
        }
      };

      const handleClassified = (updated) => {
        if (updated._id === id) {
          setTicket((prev) => ({ ...prev, ...updated }));
          const existingDraft = updated.suggestedResponse || updated.aiMeta?.suggestedResponse;
          if (existingDraft) {
            setAiDraft(existingDraft);
          }
        }
      };

      socket.on('ticket:message', handleNewMessage);
      socket.on('ticket:note', handleNewNote);
      socket.on('ticket:status_changed', handleStatusChanged);
      socket.on('ticket:assigned', handleAssigned);
      socket.on('ticket:updated', handleUpdated);
      socket.on('ticket:classified', handleClassified);

      return () => {
        leaveTicketRoom(id);
        socket.off('ticket:message', handleNewMessage);
        socket.off('ticket:note', handleNewNote);
        socket.off('ticket:status_changed', handleStatusChanged);
        socket.off('ticket:assigned', handleAssigned);
        socket.off('ticket:updated', handleUpdated);
        socket.off('ticket:classified', handleClassified);
      };
    }
  }, [id, socket, joinTicketRoom, leaveTicketRoom]);

  // Handle Public Reply Send
  const handleSendPublicReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await adminService.addPublicMessage(id, { body: replyText.trim() });
      if (res.success && res.data?.message) {
        setReplyText('');
        if (res.data.ticketStatus) {
          setTicket((prev) => ({ ...prev, status: res.data.ticketStatus }));
        }
        addToast({ type: 'success', message: 'Official response sent to author' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to send message' });
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Internal Note Add
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setSavingNote(true);
      const res = await adminService.addNote(id, noteText.trim());
      if (res.success && res.data?.note) {
        setNoteText('');
        addToast({ type: 'success', message: 'Internal note saved (Admin Only)' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to save note' });
    } finally {
      setSavingNote(false);
    }
  };

  // Handle AI Draft Request
  const handleGenerateDraft = async () => {
    try {
      setGeneratingDraft(true);
      setDraftError(null);
      const res = await adminService.requestAiDraft(id);
      if (res.success && res.data?.draft) {
        setAiDraft(res.data.draft);
        addToast({
          type: 'success',
          message: res.data.cached ? 'Loaded cached response draft' : 'Generated fresh AI response draft',
        });
      } else if (res.data?.error) {
        setDraftError(res.data.error);
      }
    } catch (err) {
      setDraftError(err.message || 'AI service unavailable');
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Insert Draft into Public Reply Box
  const handleInsertDraft = () => {
    if (!aiDraft) return;
    setReplyText(aiDraft);
    setActiveTab('triage');
    addToast({ type: 'info', message: 'Draft copied to public reply composer for review' });
  };

  // Handle AI Reclassification
  const handleReclassify = async () => {
    try {
      setReclassifying(true);
      const res = await adminService.triggerAiClassify(id);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        const refreshedDraft = res.data.ticket.suggestedResponse || res.data.ticket.aiMeta?.suggestedResponse;
        if (refreshedDraft) {
          setAiDraft(refreshedDraft);
        }
        addToast({ type: 'success', message: 'AI Classification and suggested response refreshed' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Reclassification failed' });
    } finally {
      setReclassifying(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus) => {
    try {
      const res = await adminService.updateStatus(id, newStatus);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        addToast({ type: 'success', message: `Status updated to ${newStatus}` });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  // Assignee Change
  const handleAssignChange = async (assignVal) => {
    try {
      const res = await adminService.assignTicket(id, assignVal === 'unassigned' ? null : assignVal);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        addToast({ type: 'success', message: 'Assignee updated' });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to assign' });
    }
  };

  // Category Override
  const handleCategoryOverride = async (newCat) => {
    try {
      const res = await adminService.updateCategory(id, newCat);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        addToast({ type: 'success', message: `Category overridden to ${newCat} (Manual)` });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to override category' });
    }
  };

  // Priority Override
  const handlePriorityOverride = async (newPri) => {
    try {
      const res = await adminService.updatePriority(id, newPri);
      if (res.success && res.data?.ticket) {
        setTicket(res.data.ticket);
        addToast({ type: 'success', message: `Priority overridden to ${newPri} (Manual)` });
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to override priority' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-paper-200">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="font-serif text-lg font-bold">Ticket Not Found</h3>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/admin/tickets')}>
          Return to Queue
        </Button>
      </div>
    );
  }

  const { authorId: author, bookId: book } = ticket;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-paper-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/tickets')}
            className="p-1.5 rounded-lg border border-paper-300 text-ink-600 hover:text-ink-950 hover:bg-paper-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-ink-900 bg-paper-200 px-2.5 py-0.5 rounded">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink-950 tracking-tight mt-1">
              {ticket.subject}
            </h1>
          </div>
        </div>

        {/* Quick Triage Actions */}
        <div className="flex items-center gap-2">
          {ticket.status !== 'Resolved' && (
            <Button
              variant="success"
              size="sm"
              onClick={() => handleStatusChange('Resolved')}
            >
              Mark Resolved
            </Button>
          )}
          {ticket.status !== 'Closed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('Closed')}
            >
              Close Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: 3-Column Split Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Author & Book Dossier (3 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Author Dossier */}
          <Card>
            <CardHeader title="Author Dossier" subtitle="Account & Profile Facts" />
            <CardBody className="p-4 space-y-3 text-xs">
              <div>
                <span className="font-semibold text-ink-900 block text-sm">{author?.name}</span>
                <span className="text-ink-500 font-mono text-[11px] block">{author?.author_id} · {author?.email}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-paper-200 text-ink-600">
                <div>
                  <span className="text-ink-400 block text-[10px] uppercase font-semibold">City</span>
                  <span className="font-medium text-ink-800">{author?.city || 'India'}</span>
                </div>
                <div>
                  <span className="text-ink-400 block text-[10px] uppercase font-semibold">Joined</span>
                  <span className="font-medium text-ink-800">
                    {author?.joined_date ? new Date(author.joined_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Book Dossier */}
          <Card>
            <CardHeader title="Book Dossier" subtitle="Catalog & Royalties Record" />
            <CardBody className="p-4 space-y-3 text-xs">
              {book ? (
                <>
                  <div>
                    <span className="font-semibold text-ink-900 block text-sm">{book.title}</span>
                    <span className="text-ink-500 font-mono text-[11px] block">
                      ISBN: {book.isbn || 'Pending registration'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-paper-200">
                    <span className="text-ink-500">Publication State:</span>
                    <BookStatusBadge status={book.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-paper-200 text-ink-600">
                    <div>
                      <span className="text-ink-400 block text-[10px] uppercase font-semibold">MRP</span>
                      <span className="font-bold text-ink-900">{book.mrp !== null ? `₹${book.mrp}` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block text-[10px] uppercase font-semibold">Royalty / Copy</span>
                      <span className="font-bold text-ink-900">
                        {book.author_royalty_per_copy !== null ? `₹${book.author_royalty_per_copy}` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-ink-400 block text-[10px] uppercase font-semibold">Copies Sold</span>
                      <span className="font-bold text-ink-900">{book.total_copies_sold || 0}</span>
                    </div>
                    <div>
                      <span className="text-ink-400 block text-[10px] uppercase font-semibold">Print Partner</span>
                      <span className="font-medium text-ink-800">{book.print_partner || 'In-House'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-paper-50 rounded-lg border border-paper-200 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Royalty Earned:</span>
                      <span className="font-bold text-ink-900">₹{(book.total_royalty_earned || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Royalty Paid:</span>
                      <span className="font-medium text-sage-dark">₹{(book.royalty_paid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500 font-semibold">Royalty Pending:</span>
                      <span className="font-bold text-brand">₹{(book.royalty_pending || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {book.available_on && book.available_on.length > 0 && (
                    <div className="pt-2 border-t border-paper-200">
                      <span className="text-ink-400 block text-[10px] uppercase font-semibold mb-1">
                        Active Channels
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {book.available_on.map((p) => (
                          <span key={p} className="text-[10px] px-2 py-0.5 rounded bg-paper-100 text-ink-700 border">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-ink-400 italic">
                  General / Account-level query (No specific book attached)
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* CENTER COLUMN: Inquiry & Conversation Thread (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Original Query */}
          <div className="bg-white rounded-xl border border-paper-200 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 bg-paper-100/70 border-b border-paper-200 flex items-center justify-between text-xs text-ink-600">
              <span className="font-semibold text-ink-900">Author Inquiry ({author?.name})</span>
              <span>
                {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="p-5">
              <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="space-y-3">
            {messages.map((msg) => {
              const isAdmin = msg.senderRole === 'admin';

              return (
                <div
                  key={msg._id}
                  className={`rounded-xl border shadow-2xs overflow-hidden ${
                    isAdmin
                      ? 'bg-ink-900 text-white border-ink-800 ml-4'
                      : 'bg-white text-ink-900 border-paper-200 mr-4'
                  }`}
                >
                  <div
                    className={`px-5 py-2.5 border-b flex items-center justify-between text-[11px] ${
                      isAdmin ? 'bg-ink-950 border-ink-800 text-ink-300' : 'bg-paper-100/70 border-paper-200 text-ink-500'
                    }`}
                  >
                    <span className="font-semibold">
                      {isAdmin ? `BookLeaf Support (${msg.senderName})` : `${msg.senderName} (Author)`}
                    </span>
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Public Reply Composer */}
          <Card>
            <CardHeader title="Official Public Response" subtitle="Delivered directly to author dashboard & email" />
            <CardBody className="p-5">
              <form onSubmit={handleSendPublicReply} className="space-y-3">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  placeholder="Draft your official response, verify policies, or insert an AI generated draft..."
                  required
                />
                <div className="flex items-center justify-between pt-1">
                  {aiDraft && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReplyText(aiDraft)}
                      icon={Sparkles}
                    >
                      Insert AI Draft
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={sendingReply}
                    icon={Send}
                    className="ml-auto"
                  >
                    Send to Author
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* RIGHT COLUMN: AI Assistant, Triage Controls & Internal Notes (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-paper-200/80 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'ai' ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>AI Copilot</span>
            </button>
            <button
              onClick={() => setActiveTab('triage')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'triage' ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-ink-700" />
              <span>Triage</span>
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                activeTab === 'notes' ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Notes ({internalNotes.length})</span>
            </button>
          </div>

          {/* TAB 1: AI COPILOT */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {/* Classification & Reasoning Card */}
              <Card>
                <CardHeader
                  title="AI Classification & Severity"
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReclassify}
                      loading={reclassifying}
                      icon={RefreshCw}
                    />
                  }
                />
                <CardBody className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Auto Category:</span>
                    <CategoryBadge category={ticket.category} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-500">Auto Priority:</span>
                    <PriorityBadge priority={ticket.priority} />
                  </div>

                  {ticket.aiMeta && (
                    <div className="pt-2 border-t border-paper-200 space-y-2">
                      {ticket.aiMeta.confidence !== null && (
                        <div>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-ink-500">Confidence Score:</span>
                            <span className="font-bold text-ink-900">
                              {(ticket.aiMeta.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-paper-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-brand h-1.5 rounded-full"
                              style={{ width: `${ticket.aiMeta.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {ticket.aiMeta.reasoning && (
                        <div className="p-2.5 rounded bg-paper-50 border border-paper-200 text-ink-700 text-[11px] leading-relaxed">
                          <strong>Grounded Reasoning:</strong> {ticket.aiMeta.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Response Drafting Card */}
              <Card>
                <CardHeader title="AI Response Drafting" subtitle="Grounded strictly in BookLeaf policies" />
                <CardBody className="p-4 space-y-3">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={generatingDraft}
                    onClick={handleGenerateDraft}
                    icon={Sparkles}
                    className="w-full"
                  >
                    Generate AI Draft
                  </Button>

                  {draftError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{draftError}</span>
                    </div>
                  )}

                  {aiDraft && (
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] uppercase font-bold text-ink-500">
                            Suggested Response (Editable):
                          </label>
                          <span className="text-[10px] text-ink-400">Admin Approval Required</span>
                        </div>
                        <textarea
                          value={aiDraft}
                          onChange={(e) => setAiDraft(e.target.value)}
                          rows={6}
                          className="w-full p-2.5 bg-paper-50 rounded-lg border border-paper-300 text-xs text-ink-900 leading-relaxed font-sans focus:outline-none focus:ring-1 focus:ring-brand"
                          placeholder="AI response draft..."
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleInsertDraft}
                          className="flex-1 text-xs"
                        >
                          Use in Public Reply
                        </Button>
                      </div>
                      <p className="text-[10px] text-ink-400 text-center">
                        *AI drafts require human approval and are never auto-sent.
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          {/* TAB 2: TRIAGE CONTROLS */}
          {activeTab === 'triage' && (
            <Card>
              <CardHeader title="Ticket Management Controls" subtitle="Status, Assignee & Overrides" />
              <CardBody className="p-4 space-y-4 text-xs">
                {/* Status */}
                <div>
                  <label className="block text-ink-600 font-semibold mb-1">Ticket Status</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full p-2 border border-paper-300 rounded-lg bg-white"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-ink-600 font-semibold mb-1">Assigned Admin</label>
                  <select
                    value={ticket.assignedTo?._id || 'unassigned'}
                    onChange={(e) => handleAssignChange(e.target.value)}
                    className="w-full p-2 border border-paper-300 rounded-lg bg-white"
                  >
                    <option value="unassigned">Unassigned</option>
                    <option value="me">Assign to Me ({user?.name})</option>
                  </select>
                </div>

                {/* Category Override */}
                <div className="pt-2 border-t border-paper-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-ink-600 font-semibold">Category Override</label>
                    {ticket.classificationSource === 'manual' && (
                      <span className="text-[10px] text-brand font-medium">Overridden Manually</span>
                    )}
                  </div>
                  <select
                    value={ticket.category}
                    onChange={(e) => handleCategoryOverride(e.target.value)}
                    className="w-full p-2 border border-paper-300 rounded-lg bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Override */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-ink-600 font-semibold">Priority Override</label>
                    {ticket.classificationSource === 'manual' && (
                      <span className="text-[10px] text-brand font-medium">Overridden Manually</span>
                    )}
                  </div>
                  <select
                    value={ticket.priority}
                    onChange={(e) => handlePriorityOverride(e.target.value)}
                    className="w-full p-2 border border-paper-300 rounded-lg bg-white"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </CardBody>
            </Card>
          )}

          {/* TAB 3: INTERNAL NOTES (ADMIN ONLY) */}
          {activeTab === 'notes' && (
            <Card>
              <CardHeader
                title="Internal Notes"
                subtitle="Admin only — never visible to authors"
              />
              <CardBody className="p-4 space-y-4">
                {/* Notes List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {internalNotes.length > 0 ? (
                    internalNotes.map((note) => (
                      <div
                        key={note._id}
                        className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs"
                      >
                        <div className="flex justify-between text-[10px] text-amber-800 font-medium mb-1">
                          <span>{note.adminName}</span>
                          <span>
                            {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-ink-900 leading-snug whitespace-pre-wrap">{note.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-ink-400 italic text-center py-4">
                      No internal notes recorded yet.
                    </p>
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-paper-200">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={2}
                    placeholder="Add private note for colleagues (e.g. verified bank IFSC code)..."
                    required
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    loading={savingNote}
                    icon={Lock}
                    className="w-full text-xs"
                  >
                    Save Private Note
                  </Button>
                </form>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
