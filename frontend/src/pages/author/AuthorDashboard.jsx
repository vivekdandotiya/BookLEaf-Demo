import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authorService } from '../../services/authorService';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../../components/common/Badge';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import {
  BookOpen,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
} from 'lucide-react';

export const AuthorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await authorService.getDashboard();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Dashboard Error</h4>
          <p className="text-xs mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const { author, counts, financials, recentTickets } = data;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-ink-950 via-ink-900 to-ink-800 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-ink-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-light bg-brand/30 px-2.5 py-0.5 rounded-full">
              Author Overview
            </span>
            <span className="text-xs text-ink-400">ID: {author?.author_id}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {author?.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-300 pt-1">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand-light" />
              {author?.city || 'India'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand-light" />
              Partnered since{' '}
              {author?.joined_date ? new Date(author.joined_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'N/A'}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={PlusCircle}
          onClick={() => navigate('/author/tickets/new')}
          className="shrink-0 shadow-md"
        >
          Submit Support Query
        </Button>
      </div>

      {/* Metrics Grid */}
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink-900 mb-4 tracking-tight">
          Performance & Publishing Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Total Books */}
          <Card hover>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Total Books</p>
                <p className="font-serif text-2xl font-bold text-ink-900 mt-1">{counts?.totalBooks ?? 0}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {counts?.publishedBooks ?? 0} Live · {counts?.inProductionBooks ?? 0} In Production
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-paper-100 text-ink-700 flex items-center justify-center border border-paper-200">
                <BookOpen className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          {/* Copies Sold */}
          <Card hover>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Copies Sold</p>
                <p className="font-serif text-2xl font-bold text-ink-900 mt-1">
                  {counts?.totalCopiesSold?.toLocaleString('en-IN') ?? 0}
                </p>
                <p className="text-xs text-sage font-medium mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Across all channels
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sage-light text-sage-dark flex items-center justify-center border border-sage/20">
                <TrendingUp className="w-5 h-5 text-sage" />
              </div>
            </CardBody>
          </Card>

          {/* In Production */}
          <Card hover>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">In Production</p>
                <p className="font-serif text-2xl font-bold text-ink-900 mt-1">
                  {counts?.inProductionBooks ?? 0}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">Active stages (Design / Typesetting)</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-light text-amber-dark flex items-center justify-center border border-amber/20">
                <Clock className="w-5 h-5 text-amber" />
              </div>
            </CardBody>
          </Card>

          {/* Total Royalty Earned */}
          <Card hover>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Royalty Earned</p>
                <p className="font-serif text-2xl font-bold text-ink-900 mt-1">
                  {financials?.formattedEarned ?? '₹0'}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">80% author net profit share</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-paper-100 text-ink-800 flex items-center justify-center border border-paper-200">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          {/* Royalty Paid */}
          <Card hover>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Royalty Paid</p>
                <p className="font-serif text-2xl font-bold text-sage-dark mt-1">
                  {financials?.formattedPaid ?? '₹0'}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">Direct bank transfers completed</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-sage-light text-sage flex items-center justify-center border border-sage/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>

          {/* Royalty Pending */}
          <Card hover className={financials?.totalRoyaltyPending > 0 ? 'border-brand/40 bg-brand-light/20' : ''}>
            <CardBody className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-ink-500 uppercase tracking-wider">Royalty Pending</p>
                <p className="font-serif text-2xl font-bold text-brand mt-1">
                  {financials?.formattedPending ?? '₹0'}
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  {financials?.totalRoyaltyPending >= 1000
                    ? 'Eligible for next quarterly cycle'
                    : 'Below ₹1,000 threshold (rolls over)'}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-brand-light text-brand flex items-center justify-center border border-brand/30">
                <Clock className="w-5 h-5" />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Recent Support Inquiries */}
      <Card>
        <CardHeader
          title="Recent Support Tickets"
          subtitle="Real-time status of your communication with BookLeaf operations"
          action={
            <Button
              variant="outline"
              size="sm"
              icon={ChevronRight}
              className="flex-row-reverse"
              onClick={() => navigate('/author/tickets')}
            >
              View All Tickets
            </Button>
          }
        />
        <div className="overflow-x-auto">
          {recentTickets && recentTickets.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-paper-100/70 border-b border-paper-200/80 text-xs uppercase tracking-wider text-ink-500 font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Ticket #</th>
                  <th className="px-6 py-3.5">Subject</th>
                  <th className="px-6 py-3.5">Related Book</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Submitted</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200/70">
                {recentTickets.map((ticket) => (
                  <tr
                    key={ticket._id}
                    className="hover:bg-paper-50/80 transition cursor-pointer"
                    onClick={() => navigate(`/author/tickets/${ticket._id}`)}
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
          ) : (
            <EmptyState
              title="No Support Queries"
              description="You haven't submitted any support requests yet. If you have questions regarding your royalties or books, feel free to reach out."
              actionLabel="Submit First Query"
              onAction={() => navigate('/author/tickets/new')}
            />
          )}
        </div>
      </Card>
    </div>
  );
};
