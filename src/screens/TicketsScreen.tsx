import React, { useMemo, useState } from 'react';
import { CheckSquare, Clock, Download, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { api, formatRelativeTime, formatSlaCountdown } from '../api';
import type { Ticket, TicketPriority, TicketStatus } from '../types';
import { PriorityText, SentimentLabel, StatusBadge } from '../components/StatusPill';

interface TicketsScreenProps {
  tickets: Ticket[];
  onOpenTicket: (id: number) => void;
  onTicketsChanged: () => Promise<void>;
  onOpenNewTicket: () => void;
}

const AGENTS = ['Elena Rostova', 'Daniel Cho', 'Priya Nair'];

export function TicketsScreen({
  tickets,
  onOpenTicket,
  onTicketsChanged,
  onOpenNewTicket,
}: TicketsScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.ticket_code.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customer_company.toLowerCase().includes(q) ||
        t.assignee.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  function toggleRow(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((t) => t.id));
    }
  }

  async function handleBulkAction(payload: { status?: string; assignee?: string }) {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      await api.bulkUpdateTickets({ ids: selectedIds, ...payload });
      setSelectedIds([]);
      await onTicketsChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleInlineUpdate(id: number, patch: Partial<Ticket>) {
    await api.updateTicket(id, patch);
    await onTicketsChanged();
  }

  async function handleDelete(id: number) {
    await api.deleteTicket(id);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    await onTicketsChanged();
  }

  function handleExportCsv() {
    const headers = ['Ticket Code', 'Subject', 'Company', 'Status', 'Priority', 'Category', 'Assignee', 'AI Confidence'];
    const rows = filtered.map((t) => [
      t.ticket_code,
      `"${t.subject.replace(/"/g, '""')}"`,
      `"${t.customer_company.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      `"${t.category}"`,
      `"${t.assignee}"`,
      `${t.ai_confidence}%`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assist-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Tickets Directory
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B] tabular-nums">
              {filtered.length} records in live SQLite triage view
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
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

        {/* Filter & Bulk Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3.5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by ID, subject, customer, assignee..."
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-1.5 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="urgent">Urgent</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">P1 Urgent</option>
              <option value="high">P2 High</option>
              <option value="medium">P3 Medium</option>
              <option value="low">P4 Low</option>
            </select>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-[#DBEAFE] bg-[#EFF4FF] px-3 py-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] tabular-nums">
                <CheckSquare className="h-3.5 w-3.5" />
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleBulkAction({ status: 'resolved' })}
                className="rounded-md bg-[#0F172A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1E293B] cursor-pointer"
              >
                Mark Resolved
              </button>
              <select
                disabled={busy}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkAction({ assignee: e.target.value });
                    e.target.value = '';
                  }
                }}
                className="rounded-md border border-[#BFDBFE] bg-white px-2 py-1 text-[11px] font-medium text-[#1E293B]"
              >
                <option value="" disabled>
                  Reassign...
                </option>
                {AGENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* High-Density Triage Table */}
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#475569]">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.length === filtered.length}
                      onChange={toggleAll}
                      aria-label="Select all tickets"
                      className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#2563EB]"
                    />
                  </th>
                  <th className="px-3 py-3">Ticket</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Priority</th>
                  <th className="px-3 py-3">Assignee</th>
                  <th className="px-3 py-3">Sentiment</th>
                  <th className="px-3 py-3 text-right">AI Match</th>
                  <th className="px-3 py-3 text-right">SLA</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.map((t) => {
                  const sla = formatSlaCountdown(t.sla_due_at, t.status);
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t.id)}
                          onChange={() => toggleRow(t.id)}
                          aria-label={`Select ${t.ticket_code}`}
                          className="h-3.5 w-3.5 rounded border-[#CBD5E1] text-[#2563EB]"
                        />
                      </td>
                      <td className="max-w-[290px] px-3 py-3">
                        <button
                          type="button"
                          onClick={() => onOpenTicket(t.id)}
                          className="group text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-[#2563EB] group-hover:underline">
                              {t.ticket_code}
                            </span>
                            <span className="text-[11px] text-[#64748B]">
                              {formatRelativeTime(t.updated_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate font-medium text-[#0F172A]">{t.subject}</p>
                        </button>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="font-medium text-[#0F172A]">{t.customer_company}</p>
                        <p className="text-[11px] text-[#64748B]">{t.customer_name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={t.status} />
                          <select
                            aria-label={`Change status for ${t.ticket_code}`}
                            value={t.status}
                            onChange={(e) =>
                              handleInlineUpdate(t.id, { status: e.target.value as TicketStatus })
                            }
                            className="rounded border border-[#E2E8F0] bg-white px-1.5 py-0.5 text-[11px] text-[#334155]"
                          >
                            <option value="urgent">Urgent</option>
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          aria-label={`Change priority for ${t.ticket_code}`}
                          value={t.priority}
                          onChange={(e) =>
                            handleInlineUpdate(t.id, { priority: e.target.value as TicketPriority })
                          }
                          className="rounded border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-medium text-[#1E293B]"
                        >
                          <option value="urgent">P1 Urgent</option>
                          <option value="high">P2 High</option>
                          <option value="medium">P3 Medium</option>
                          <option value="low">P4 Low</option>
                        </select>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <select
                          aria-label={`Change assignee for ${t.ticket_code}`}
                          value={t.assignee}
                          onChange={(e) => handleInlineUpdate(t.id, { assignee: e.target.value })}
                          className="rounded border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] text-[#1E293B]"
                        >
                          {AGENTS.map((a) => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <SentimentLabel sentiment={t.sentiment} />
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-[#7C3AED] tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t.ai_confidence}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            sla.breached
                              ? 'font-semibold text-[#B91C1C]'
                              : sla.atRisk
                                ? 'font-semibold text-[#B45309]'
                                : 'text-[#475569]'
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          {sla.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenTicket(t.id)}
                            className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#2563EB] hover:bg-[#EFF4FF] cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t.id)}
                            aria-label={`Delete ${t.ticket_code}`}
                            className="rounded-md p-1 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#B91C1C] cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-sm text-[#64748B]">
                      No tickets match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
