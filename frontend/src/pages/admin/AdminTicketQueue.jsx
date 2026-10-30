import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { Pagination } from '../../components/common/Pagination';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  Search,
  Filter,
  RefreshCw,
  User,
  Sparkles,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminTicketQueue = () => {
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [category, setCategory] = useState('all');
  const [assignedTo, setAssignedTo] = useState('all');
  const [sortBy, setSortBy] = useState('urgency');
  const [page, setPage] = useState(1);

  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        status: status !== 'all' ? status : undefined,
        priority: priority !== 'all' ? priority : undefined,
        category: category !== 'all' ? category : undefined,
        assignedTo: assignedTo !== 'all' ? assignedTo : undefined,
        sortBy,
        page,
        limit: 15,
      };

      const res = await adminService.getTickets(params);
      if (res.success && res.data) {
        setTickets(res.data.tickets || []);
        if (res.meta) {
          setMeta(res.meta);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets queue:', err);
    } finally {
      setLoading(false);
    }
  }, [search, status, priority, category, assignedTo, sortBy, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time socket events for admin queue
  useEffect(() => {
    if (!socket) return;

    const handleTicketCreated = (newTicket) => {
      addToast({
        type: 'info',
        message: `New Ticket Arrived: ${newTicket.ticketNumber} from ${newTicket.authorId?.name}`,
      });
      // Insert into top of list
      setTickets((prev) => [newTicket, ...prev]);
      setMeta((prev) => ({ ...prev, total: prev.total + 1 }));
    };

    const handleTicketClassified = (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? { ...t, ...updatedTicket } : t))
      );
    };

    const handleTicketStatusChanged = ({ ticketId, status }) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status } : t))
      );
    };

    const handleTicketAssigned = ({ ticketId, assignedTo, ticket }) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, assignedTo: ticket?.assignedTo || assignedTo } : t))
      );
    };

    socket.on('ticket:created', handleTicketCreated);
    socket.on('ticket:classified', handleTicketClassified);
    socket.on('ticket:status_changed', handleTicketStatusChanged);
    socket.on('ticket:assigned', handleTicketAssigned);

    return () => {
      socket.off('ticket:created', handleTicketCreated);
      socket.off('ticket:classified', handleTicketClassified);
      socket.off('ticket:status_changed', handleTicketStatusChanged);
      socket.off('ticket:assigned', handleTicketAssigned);
    };
  }, [socket, addToast]);

  return (
    <div className="space-y-6">
      {/* Page Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
              Support Triage Queue
            </h1>
            <span className="bg-ink-900 text-white font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold">
              {meta.total} Total
            </span>
          </div>
          <p className="text-sm text-ink-600 mt-1">
            Real-time incoming queries across all authors with AI classification and severity weighting.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchTickets}
          loading={loading}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Triage Filter Panel */}
      <Card>
        <CardBody className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full md:flex-1">
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search ticket #, subject, or query contents..."
                className="w-full pl-10 pr-4 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-brand"
              />
            </div>

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-36 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-xs font-medium text-ink-800 focus:outline-none focus:border-brand"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-36 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-xs font-medium text-ink-800 focus:outline-none focus:border-brand"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-44 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-xs font-medium text-ink-800 focus:outline-none focus:border-brand"
            >
              <option value="all">All Categories</option>
              <option value="Royalty & Payments">Royalty & Payments</option>
              <option value="ISBN & Metadata Issues">ISBN & Metadata</option>
              <option value="Printing & Quality">Printing & Quality</option>
              <option value="Distribution & Availability">Distribution</option>
              <option value="Book Status & Production Updates">Production Updates</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>

            {/* Sorting */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-40 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-xs font-medium text-ink-800 focus:outline-none focus:border-brand"
            >
              <option value="urgency">Sort: Urgency First</option>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="lastMessage">Sort: Last Active</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* High Density Table */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ink-900 text-white font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Ticket #</th>
                  <th className="px-5 py-3.5">Author</th>
                  <th className="px-5 py-3.5">Subject & Preview</th>
                  <th className="px-5 py-3.5">Book Context</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5 text-right">Triage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {tickets.map((t) => {
                  const isCritical = t.priority === 'Critical';
                  const isHigh = t.priority === 'High';
                  const isUnassigned = !t.assignedTo;

                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/admin/tickets/${t._id}`)}
                      className={`hover:bg-paper-100/70 transition cursor-pointer ${
                        isCritical ? 'bg-red-50/40 font-medium' : isHigh ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      {/* Ticket Number */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-ink-900">{t.ticketNumber}</span>
                        {t.classificationSource === 'ai' && (
                          <span
                            title="AI Auto-Classified"
                            className="inline-flex items-center ml-1 text-brand"
                          >
                            <Sparkles className="w-3 h-3 inline" />
                          </span>
                        )}
                        {t.classificationSource === 'manual' && (
                          <span
                            title="Admin Manual Override"
                            className="text-[9px] font-semibold text-ink-400 block uppercase"
                          >
                            Manual
                          </span>
                        )}
                      </td>

                      {/* Author */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-semibold text-ink-900 block truncate max-w-[130px]">
                          {t.authorId?.name || 'Unknown Author'}
                        </span>
                        <span className="text-[10px] text-ink-400 block truncate max-w-[130px]">
                          {t.authorId?.email}
                        </span>
                      </td>

                      {/* Subject & snippet */}
                      <td className="px-5 py-3.5 max-w-xs">
                        <p className="font-semibold text-ink-900 truncate">{t.subject}</p>
                        <p className="text-[11px] text-ink-500 truncate mt-0.5">{t.description}</p>
                      </td>

                      {/* Book */}
                      <td className="px-5 py-3.5 whitespace-nowrap max-w-[150px]">
                        {t.bookId ? (
                          <>
                            <span className="font-medium text-ink-800 block truncate">{t.bookId.title}</span>
                            <span className="text-[10px] text-ink-400 font-mono block">
                              {t.bookId.isbn || t.bookId.status}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink-400 italic">General / Account</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <CategoryBadge category={t.category} />
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Assigned Admin */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {t.assignedTo ? (
                          <span className="px-2 py-0.5 rounded bg-ink-100 text-ink-800 font-medium text-[11px]">
                            {t.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-ink-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-ink-500 text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Action Chevron */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <ChevronRight className="w-4 h-4 text-ink-400 inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Queue is Clear"
            description="No tickets currently match your selected filters."
            actionLabel="Reset Queue Filters"
            onAction={() => {
              setSearch('');
              setStatus('all');
              setPriority('all');
              setCategory('all');
              setAssignedTo('all');
              setSortBy('urgency');
            }}
          />
        )}

        {/* Server-Side Pagination */}
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={15}
          onPageChange={(newPage) => setPage(newPage)}
        />
      </Card>
    </div>
  );
};
