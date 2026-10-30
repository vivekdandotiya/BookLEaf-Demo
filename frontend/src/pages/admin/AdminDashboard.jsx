import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { Card, CardHeader, CardBody } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import {
  Users,
  BookOpen,
  Inbox,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const res = await adminService.getDashboard();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const { totals, statusCounts, priorityCounts, categoryCounts, metrics } = data || {};

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink-950 tracking-tight">
            Operations & SLA Dashboard
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Global support pipeline metrics, SLA compliance, and category distribution.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Inbox}
          onClick={() => navigate('/admin/tickets')}
        >
          Open Ticket Queue
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Authors */}
        <Card hover>
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Active Authors</p>
              <p className="font-serif text-3xl font-bold text-ink-950 mt-1">{totals?.authors || 0}</p>
              <p className="text-xs text-ink-400 mt-0.5">Seeded Author Directory</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-ink-900 text-white flex items-center justify-center shadow-xs">
              <Users className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        {/* Total Catalog Books */}
        <Card hover>
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Catalog Titles</p>
              <p className="font-serif text-3xl font-bold text-ink-950 mt-1">{totals?.books || 0}</p>
              <p className="text-xs text-ink-400 mt-0.5">Published & In Production</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-paper-100 text-ink-800 flex items-center justify-center border border-paper-200">
              <BookOpen className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        {/* Total Tickets */}
        <Card hover>
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Total Inquiries</p>
              <p className="font-serif text-3xl font-bold text-ink-950 mt-1">{totals?.tickets || 0}</p>
              <p className="text-xs text-brand font-medium mt-0.5">
                {statusCounts?.Open || 0} Open · {statusCounts?.['In Progress'] || 0} In Progress
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-brand-light text-brand flex items-center justify-center border border-brand/20">
              <Inbox className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>

        {/* Avg First Response Time */}
        <Card hover>
          <CardBody className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Avg 1st Response</p>
              <p className="font-serif text-3xl font-bold text-sage-dark mt-1">
                {metrics?.averageFirstResponseFormatted || (
                  <span className="text-base font-sans text-ink-400">N/A</span>
                )}
              </p>
              <p className="text-xs text-ink-400 mt-0.5">
                {metrics?.respondedTicketsCount > 0
                  ? `Computed from ${metrics.respondedTicketsCount} tickets`
                  : 'Awaiting first admin replies'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-light text-sage flex items-center justify-center border border-sage/20">
              <Clock className="w-6 h-6" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Two Column Visual Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status & Priority Distribution */}
        <Card>
          <CardHeader title="Pipeline State & Urgency" subtitle="Tickets grouped by lifecycle and priority" />
          <CardBody className="p-6 space-y-6">
            {/* Status Bars */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                By Status Lifecycle
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[11px] font-semibold text-blue-800 uppercase block">Open</span>
                  <span className="font-serif text-2xl font-bold text-blue-900 mt-0.5 block">
                    {statusCounts?.Open || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
                  <span className="text-[11px] font-semibold text-purple-800 uppercase block">In Progress</span>
                  <span className="font-serif text-2xl font-bold text-purple-900 mt-0.5 block">
                    {statusCounts?.['In Progress'] || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Resolved</span>
                  <span className="font-serif text-2xl font-bold text-emerald-900 mt-0.5 block">
                    {statusCounts?.Resolved || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase block">Closed</span>
                  <span className="font-serif text-2xl font-bold text-slate-900 mt-0.5 block">
                    {statusCounts?.Closed || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Bars */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">
                By Priority Severity
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <span className="text-[11px] font-semibold text-red-800 uppercase block">Critical</span>
                  <span className="font-serif text-2xl font-bold text-red-900 mt-0.5 block">
                    {priorityCounts?.Critical || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <span className="text-[11px] font-semibold text-orange-800 uppercase block">High</span>
                  <span className="font-serif text-2xl font-bold text-orange-900 mt-0.5 block">
                    {priorityCounts?.High || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[11px] font-semibold text-amber-800 uppercase block">Medium</span>
                  <span className="font-serif text-2xl font-bold text-amber-900 mt-0.5 block">
                    {priorityCounts?.Medium || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase block">Low</span>
                  <span className="font-serif text-2xl font-bold text-slate-900 mt-0.5 block">
                    {priorityCounts?.Low || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader title="Inquiry Categories" subtitle="Distribution of support topics across system" />
          <CardBody className="p-6 space-y-4">
            {Object.keys(categoryCounts || {}).length > 0 ? (
              Object.entries(categoryCounts).map(([cat, count]) => {
                const total = totals?.tickets || 1;
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink-800">{cat}</span>
                      <span className="font-semibold text-ink-900">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-paper-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand h-2 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-ink-400 italic">
                No tickets submitted yet to display category distribution.
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
