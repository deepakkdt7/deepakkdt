import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, Clock, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { api, formatRelativeTime, formatSlaCountdown } from '../api';
import type { OverviewData } from '../types';
import { PriorityText, StatusBadge } from '../components/StatusPill';

interface OverviewScreenProps {
  onOpenTicket: (ticketId: number) => void;
  onOpenNewTicket: () => void;
  onNavigateTickets: () => void;
}

export function OverviewScreen({
  onOpenTicket,
  onOpenNewTicket,
  onNavigateTickets,
}: OverviewScreenProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadOverview() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getOverview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operations overview');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-[#E2E8F0]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
            ))}
          </div>
          <div className="h-80 animate-pulse rounded-2xl border border-[#E2E8F0] bg-white" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-[#FECACA] bg-white p-6 text-center">
          <p className="text-sm font-semibold text-[#B91C1C]">Unable to load overview</p>
          <p className="mt-1 text-xs text-[#64748B]">{error}</p>
          <button
            type="button"
            onClick={loadOverview}
            className="mt-4 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-medium text-white hover:bg-[#1E293B]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Operations Overview
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              Real-time queue telemetry, SLA adherence, and AI Copilot synthesis performance
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onOpenNewTicket}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Ticket
            </button>
          </div>
        </header>

        {/* 4-Column KPI Strip */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Active Queue</span>
              <span className="text-[#B91C1C] font-semibold tabular-nums">
                {kpis.urgentCount} Urgent
              </span>
            </div>
            <p className="mt-2.5 font-mono text-3xl font-bold tracking-tight text-[#0F172A] tabular-nums">
              {kpis.openCount}
            </p>
            <p className="mt-1 text-xs text-[#64748B] tabular-nums">
              {kpis.resolvedCount} resolved of {kpis.totalCount} total tickets
            </p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>SLA Compliance</span>
              <span className="text-[#047857] font-semibold">Target 95%</span>
            </div>
            <p className="mt-2.5 font-mono text-3xl font-bold tracking-tight text-[#0F172A] tabular-nums">
              {kpis.slaCompliance.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-[#64748B]">Across Platinum, Gold & Standard tiers</p>
          </div>

          <div className="ai-glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between text-xs font-medium text-[#6D28D9]">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI Assist Rate
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {kpis.avgConfidence}% avg conf
              </span>
            </div>
            <p className="mt-2.5 font-mono text-3xl font-bold tracking-tight text-[#0F172A] tabular-nums">
              {kpis.aiAssistRate}%
            </p>
            <p className="mt-1 text-xs text-[#475569]">Tickets triaged with high-confidence drafts</p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between text-xs font-medium text-[#64748B]">
              <span>Median First Response</span>
              <span className="text-[#2563EB] font-semibold">Live 7d</span>
            </div>
            <p className="mt-2.5 font-mono text-3xl font-bold tracking-tight text-[#0F172A] tabular-nums">
              {kpis.medianFirstResponseMins}m
            </p>
            <p className="mt-1 text-xs text-[#64748B]">41% faster when applying Copilot drafts</p>
          </div>
        </section>

        {/* Charts Row */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Weekly Ticket Throughput & AI Assisted Volume
                </h2>
                <p className="text-xs text-[#64748B]">
                  Incoming volume compared with Copilot-assisted resolutions
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#475569]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#2563EB]" />
                  Incoming
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#7C3AED]" />
                  AI Assisted
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.volumeTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incoming"
                    name="Incoming"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fill="url(#incomingGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="aiAssisted"
                    name="AI Assisted"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    fill="url(#aiGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
            <h2 className="text-sm font-semibold text-[#0F172A]">Tickets by Category</h2>
            <p className="mb-4 text-xs text-[#64748B]">Live SQLite distribution across queues</p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.byCategory}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={118}
                    tick={{ fontSize: 11, fill: '#334155' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Tickets" fill="#0F172A" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Bottom Operational Tables */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* SLA Watchlist */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-3">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">Priority SLA Watchlist</h2>
                <p className="text-xs text-[#64748B]">Click any incident to jump straight into the Copilot workspace</p>
              </div>
              <button
                type="button"
                onClick={onNavigateTickets}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {data.urgentWatchlist.map((t) => {
                const sla = formatSlaCountdown(t.sla_due_at, t.status);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenTicket(t.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-[#64748B]">
                        <span className="font-mono font-semibold text-[#0F172A]">{t.ticket_code}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate font-medium text-[#334155]">{t.customer_company}</span>
                        <span aria-hidden="true">·</span>
                        <PriorityText priority={t.priority} />
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-[#0F172A]">{t.subject}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={t.status} />
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
                          sla.breached
                            ? 'font-semibold text-[#B91C1C]'
                            : sla.atRisk
                              ? 'font-semibold text-[#B45309]'
                              : 'text-[#64748B]'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {sla.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Thread Activity */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-2">
            <div className="border-b border-[#E2E8F0] px-5 py-4">
              <h2 className="text-sm font-semibold text-[#0F172A]">Recent Operations Activity</h2>
              <p className="text-xs text-[#64748B]">Latest persisted messages & internal notes</p>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {data.recentActivity.map((act) => (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => onOpenTicket(act.ticket_id)}
                  className="block w-full px-5 py-3 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#0F172A]">
                      {act.sender_name}{' '}
                      <span className="font-normal text-[#64748B]">
                        on <span className="font-mono text-[#2563EB]">{act.ticket_code}</span>
                      </span>
                    </span>
                    <span className="text-[11px] text-[#64748B] tabular-nums shrink-0">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#475569]">
                    {act.body}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
