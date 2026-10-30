import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useSocket } from '../../context/SocketContext';
import { Card, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { PlusCircle, Search, ChevronRight, LifeBuoy } from 'lucide-react';

export const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await ticketService.getMyTickets();
        if (res.success && res.data) {
          setTickets(res.data.tickets || []);
        }
      } catch (err) {
        console.error('Error fetching tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleTicketClassified = (updatedTicket) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === updatedTicket._id ? { ...t, ...updatedTicket } : t))
      );
    };

    const handleStatusChanged = ({ ticketId, status }) => {
      setTickets((prev) =>
        prev.map((t) => (t._id === ticketId ? { ...t, status } : t))
      );
    };

    socket.on('ticket:classified', handleTicketClassified);
    socket.on('ticket:status_changed', handleStatusChanged);

    return () => {
      socket.off('ticket:classified', handleTicketClassified);
      socket.off('ticket:status_changed', handleStatusChanged);
    };
  }, [socket]);

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesSearch =
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
            Support Queries
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Track communication, production inquiries, and royalty resolutions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => navigate('/author/tickets/new')}
        >
          Raise New Ticket
        </Button>
      </div>

      {/* Filter and Search */}
      <Card>
        <CardBody className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket #, subject, or category..."
              className="w-full pl-10 pr-4 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-900 focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 bg-paper-50/70 border border-paper-300 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-brand"
            >
              <option value="all">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Tickets List */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-100/70 border-b border-paper-200 text-xs uppercase tracking-wider text-ink-500 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Ticket #</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Related Book</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200/70">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    onClick={() => navigate(`/author/tickets/${ticket._id}`)}
                    className="hover:bg-paper-50 transition cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono font-medium text-xs text-brand">
                      {ticket.ticketNumber}
                    </td>
                    <td className="px-6 py-4 font-medium text-ink-900 max-w-xs truncate">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-600">
                      {ticket.bookId?.title || <span className="text-ink-400 italic">General / Account</span>}
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={ticket.category} />
                    </td>
                    <td className="px-6 py-4">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-ink-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-4 h-4 text-ink-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={LifeBuoy}
            title="No Support Tickets"
            description="You have no tickets matching your current filters. If you need any assistance, click the button below to submit a query."
            actionLabel="Submit Support Query"
            onAction={() => navigate('/author/tickets/new')}
          />
        )}
      </Card>
    </div>
  );
};
