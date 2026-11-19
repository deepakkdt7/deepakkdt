import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { api, formatRelativeTime, formatSlaCountdown } from '../api';
import type {
  AISuggestionResult,
  KBArticle,
  Ticket,
  TicketDetail,
  TicketPriority,
  TicketStatus,
} from '../types';
import { PriorityText, SentimentLabel, StatusBadge } from '../components/StatusPill';

interface InboxScreenProps {
  tickets: Ticket[];
  kbArticles: KBArticle[];
  selectedTicketId: number | null;
  defaultAgent: string;
  onSelectTicket: (id: number) => void;
  onTicketsChanged: () => Promise<void>;
  onOpenNewTicket: () => void;
}

const AGENTS = ['Elena Rostova', 'Daniel Cho', 'Priya Nair'];
const TONES = ['Professional & Technical', 'Empathetic & Executive', 'Concise & Direct'];

export function InboxScreen({
  tickets,
  kbArticles,
  selectedTicketId,
  defaultAgent,
  onSelectTicket,
  onTicketsChanged,
  onOpenNewTicket,
}: InboxScreenProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [composerMode, setComposerMode] = useState<'agent' | 'internal'>('agent');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMacroMenu, setShowMacroMenu] = useState(false);

  const [aiSuggestion, setAiSuggestion] = useState<AISuggestionResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiTone, setAiTone] = useState(TONES[0]);
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const [mobileCopilotOpen, setMobileCopilotOpen] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState('');

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.ticket_code.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customer_company.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [tickets, search, statusFilter]);

  const activeId = selectedTicketId ?? filteredTickets[0]?.id ?? tickets[0]?.id ?? null;

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setAiSuggestion(null);
    setAiError('');
    setCustomAiPrompt('');
    setAppliedBanner('');

    api
      .getTicketDetail(activeId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAiError(err instanceof Error ? err.message : 'Unable to load ticket detail');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function runAICopilot(overrideTone?: string, instruction?: string) {
    if (!detail) return;
    setAiLoading(true);
    setAiError('');
    try {
      const result = await api.generateAISuggestion({
        ticketId: detail.id,
        tone: overrideTone || aiTone,
        customInstruction: instruction ?? (customAiPrompt.trim() || undefined),
      });
      setAiSuggestion(result);
      await onTicketsChanged();
      const refreshed = await api.getTicketDetail(detail.id);
      setDetail(refreshed);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI Copilot request failed');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSendMessage(resolveAfterSend = false) {
    if (!detail || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await api.sendMessage(detail.id, {
        sender_type: composerMode,
        sender_name: defaultAgent || 'Elena Rostova',
        body: replyText.trim(),
        resolveAfterSend,
      });
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              ...res.ticket,
              messages: [...prev.messages, res.message],
            }
          : prev
      );
      setReplyText('');
      setAppliedBanner('');
      await onTicketsChanged();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to post message');
    } finally {
      setSending(false);
    }
  }

  async function handleTicketFieldUpdate(patch: Partial<Ticket>) {
    if (!detail) return;
    try {
      const updated = await api.updateTicket(detail.id, patch);
      setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
      await onTicketsChanged();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to update ticket');
    }
  }

  function handleApplyDraft(text: string, label: string) {
    setComposerMode('agent');
    setReplyText(text);
    setAppliedBanner(label);
    setMobileCopilotOpen(false);
  }

  function handleInsertResolutionSteps() {
    if (!aiSuggestion || aiSuggestion.resolutionSteps.length === 0) return;
    const formatted =
      'Recommended resolution steps:\n' +
      aiSuggestion.resolutionSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    setReplyText((prev) => (prev.trim() ? `${prev.trim()}\n\n${formatted}` : formatted));
    setAppliedBanner('Inserted AI resolution steps into composer');
    setMobileCopilotOpen(false);
  }

  async function handleInsertMacro(article: KBArticle) {
    setReplyText((prev) => (prev.trim() ? `${prev.trim()}\n\n${article.content}` : article.content));
    setShowMacroMenu(false);
    setAppliedBanner(`Inserted macro ${article.macro_shortcut}`);
    await api.updateKBArticle(article.id, { incrementUsage: true }).catch(() => {});
  }

  const publishedMacros = kbArticles.filter((a) => a.status === 'published');

  const copilotPanelContent = (
    <div className="flex h-full flex-col overflow-y-auto bg-[#F8F9FF] p-4 space-y-4">
      {/* Glassmorphic AI Suggestion Card */}
      <div className="ai-glass-card rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A]">AI Copilot Synthesis</h3>
              <p className="text-[11px] text-[#64748B]">
                Grounded in {publishedMacros.length} published KB articles
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#6D28D9] tabular-nums whitespace-nowrap">
            <Sparkles className="h-3 w-3" />
            {aiSuggestion?.confidence ?? detail?.ai_confidence ?? 90}% match
          </span>
        </div>

        {/* Tone selector & Generate Action */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={aiTone}
            onChange={(e) => setAiTone(e.target.value)}
            aria-label="Draft tone"
            className="flex-1 min-w-[150px] rounded-lg border border-[#E2E8F0] bg-white/90 px-2.5 py-1.5 text-xs font-medium text-[#1E293B] focus:border-[#7C3AED] focus:outline-none focus:ring-3 focus:ring-[#7C3AED]/15"
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                Tone: {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={aiLoading || !detail}
            onClick={() => runAICopilot()}
            className="ai-action-btn inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {aiLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {aiLoading ? 'Synthesizing...' : aiSuggestion ? 'Regenerate' : 'Generate Draft'}
          </button>
        </div>

        {aiError && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-xs text-[#B91C1C]">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* Executive Summary */}
        <div className="mt-3 rounded-lg border border-[#EDE9FE] bg-white/80 p-3">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#6D28D9]">
            <span>Context Summary</span>
            {aiSuggestion?.intent && <span className="text-[#475569]">{aiSuggestion.intent}</span>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#334155]">
            {aiSuggestion?.summary || detail?.ai_summary || 'Click Generate Draft to synthesize this thread with Gemini.'}
          </p>
        </div>

        {/* Live AI Draft & Resolution Steps */}
        {aiSuggestion ? (
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#0F172A]">Suggested Reply Draft</span>
                <span className="font-mono text-[11px] text-[#64748B]">{aiSuggestion.model}</span>
              </div>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-[#DDD6FE] bg-white p-3 text-xs leading-relaxed text-[#1E293B]">
                {aiSuggestion.draftReply}
              </div>
            </div>

            {aiSuggestion.resolutionSteps.length > 0 && (
              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#0F172A]">
                  Actionable Resolution Steps
                </span>
                <ol className="space-y-1.5">
                  {aiSuggestion.resolutionSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-[#E2E8F0] bg-white/90 px-2.5 py-2 text-xs text-[#334155]"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] font-mono text-[10px] font-semibold text-[#6D28D9]">
                        {i + 1}
                      </span>
                      <span className="leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {aiSuggestion.citedArticles.length > 0 && (
              <div className="space-y-1">
                <span className="block text-[11px] font-medium text-[#64748B]">
                  Cited Knowledge Base Sources
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {aiSuggestion.citedArticles.map((art) => (
                    <span
                      key={art.id}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-medium text-[#334155]"
                    >
                      <BookOpen className="h-3 w-3 text-[#7C3AED]" />
                      <span className="truncate max-w-[180px]">{art.title}</span>
                      <span className="font-mono text-[10px] text-[#64748B]">{art.macro_shortcut}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleApplyDraft(aiSuggestion.draftReply, 'AI Copilot draft applied to composer')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                Apply Draft
              </button>
              <button
                type="button"
                onClick={handleInsertResolutionSteps}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-white px-3 py-2 text-xs font-medium text-[#6D28D9] hover:bg-[#F5F3FF] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Insert Steps
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-[#C4B5FD] bg-white/60 p-3 text-center">
            <p className="text-xs text-[#475569]">
              Run Gemini Copilot to draft a KB-grounded response, detect sentiment, and extract resolution steps.
            </p>
          </div>
        )}

        {/* Custom AI Copilot Instruction Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customAiPrompt.trim()) {
              runAICopilot(aiTone, customAiPrompt.trim());
            }
          }}
          className="mt-3 flex items-center gap-1.5"
        >
          <input
            type="text"
            value={customAiPrompt}
            onChange={(e) => setCustomAiPrompt(e.target.value)}
            placeholder="Ask Copilot (e.g., offer 24h grace mode)..."
            className="flex-1 rounded-lg border border-[#DDD6FE] bg-white px-3 py-1.5 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#7C3AED] focus:outline-none focus:ring-3 focus:ring-[#7C3AED]/20"
          />
          <button
            type="submit"
            disabled={aiLoading || !customAiPrompt.trim() || !detail}
            className="rounded-lg border border-[#DDD6FE] bg-[#EDE9FE] px-2.5 py-1.5 text-xs font-semibold text-[#6D28D9] hover:bg-[#DDD6FE] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
          >
            Ask
          </button>
        </form>
      </div>

      {/* Customer Account Context Card */}
      {detail && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F172A] text-xs font-semibold text-white">
                {detail.customer_initials}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#0F172A]">{detail.customer_name}</h4>
                <p className="text-xs text-[#64748B]">{detail.customer_company}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#2563EB]">{detail.customer_tier}</span>
          </div>

          <dl className="mt-3.5 grid grid-cols-2 gap-3 border-t border-[#F1F5F9] pt-3 text-xs">
            <div>
              <dt className="text-[#64748B]">Email</dt>
              <dd className="mt-0.5 truncate font-medium text-[#0F172A]" title={detail.customer_email}>
                {detail.customer_email}
              </dd>
            </div>
            <div>
              <dt className="text-[#64748B]">Contract ARR</dt>
              <dd className="mt-0.5 font-mono font-semibold text-[#0F172A] tabular-nums">
                ${detail.customer_arr.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[#64748B]">SLA Plan</dt>
              <dd className="mt-0.5 font-medium text-[#0F172A]">{detail.customer_sla_tier}</dd>
            </div>
            <div>
              <dt className="text-[#64748B]">Sentiment</dt>
              <dd className="mt-0.5">
                <SentimentLabel sentiment={detail.sentiment} />
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Quick Knowledge Base Macros */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
        <div className="mb-2.5 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#0F172A]">Quick KB Macros</h4>
          <span className="text-[11px] text-[#64748B] tabular-nums">{publishedMacros.length} active</span>
        </div>
        <div className="space-y-1.5">
          {publishedMacros.slice(0, 4).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleInsertMacro(m)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-left hover:border-[#2563EB]/40 hover:bg-[#EFF4FF] transition-colors cursor-pointer"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-[#0F172A]">{m.title}</p>
                <p className="font-mono text-[11px] text-[#64748B]">{m.macro_shortcut}</p>
              </div>
              <span className="text-[11px] font-medium text-[#2563EB] shrink-0">Insert</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* TIER 2: Queue / Triage Stream */}
      <section className="flex w-full shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:w-[320px] xl:w-[360px]">
        <div className="border-b border-[#E2E8F0] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#0F172A]">Triage Queue</h1>
              <p className="text-xs text-[#64748B] tabular-nums">
                {filteredTickets.length} of {tickets.length} conversations
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenNewTicket}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1E293B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              New Ticket
            </button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket ID, company, topic..."
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-[#F1F5F9] p-1 overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'urgent', label: 'Urgent' },
                { id: 'open', label: 'Open' },
                { id: 'in_progress', label: 'Active' },
                { id: 'resolved', label: 'Resolved' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#0F172A] shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#F1F5F9]">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FileText className="h-8 w-8 text-[#CBD5E1]" />
              <p className="mt-3 text-sm font-medium text-[#0F172A]">No matching tickets</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Adjust your queue filters or create a new customer incident.
              </p>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = t.id === activeId;
              const sla = formatSlaCountdown(t.sla_due_at, t.status);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTicket(t.id)}
                  className={`relative flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#F1F5F9] shadow-[inset_3px_0_0_#2563EB]'
                      : 'bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-[#475569]">
                        {t.ticket_code}
                      </span>
                      <span className="truncate text-xs font-semibold text-[#0F172A]">
                        {t.customer_company}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#64748B] tabular-nums shrink-0">
                      {formatRelativeTime(t.updated_at)}
                    </span>
                  </div>

                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1E293B]">
                    {t.subject}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={t.status} />
                      <span className="truncate text-[11px] text-[#64748B]">{t.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[11px] tabular-nums ${
                          sla.breached
                            ? 'font-semibold text-[#B91C1C]'
                            : sla.atRisk
                              ? 'font-semibold text-[#B45309]'
                              : 'text-[#64748B]'
                        }`}
                      >
                        <Clock className="h-3 w-3" />
                        {sla.label}
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-medium text-[#7C3AED] tabular-nums">
                        <Sparkles className="h-3 w-3" />
                        {t.ai_confidence}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* TIER 3: Active Conversation (60%) + AI Copilot Pane (40%) */}
      <div className="hidden min-w-0 flex-1 md:flex">
        {/* Conversation Canvas */}
        <section className="flex min-w-0 flex-[3] flex-col bg-[#F8FAFC]">
          {loadingDetail && !detail ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#64748B]">
              Loading conversation...
            </div>
          ) : !detail ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-medium text-[#0F172A]">Select a ticket to start triaging</p>
              <p className="mt-1 text-xs text-[#64748B]">
                Choose a conversation from the queue or open a new operations ticket.
              </p>
            </div>
          ) : (
            <>
              {/* Conversation Header */}
              <header className="border-b border-[#E2E8F0] bg-white px-5 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                      <span className="font-mono font-semibold text-[#0F172A]">
                        {detail.ticket_code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-medium text-[#2563EB]">
                        <Building2 className="h-3.5 w-3.5" />
                        {detail.customer_company}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{detail.channel}</span>
                      <span aria-hidden="true">·</span>
                      <PriorityText priority={detail.priority} />
                    </div>
                    <h2 className="mt-1 text-base font-semibold leading-snug text-[#0F172A]">
                      {detail.subject}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setMobileCopilotOpen(true)}
                      className="xl:hidden ai-action-btn inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Copilot
                    </button>

                    <select
                      aria-label="Ticket status"
                      value={detail.status}
                      onChange={(e) =>
                        handleTicketFieldUpdate({ status: e.target.value as TicketStatus })
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    <select
                      aria-label="Ticket priority"
                      value={detail.priority}
                      onChange={(e) =>
                        handleTicketFieldUpdate({ priority: e.target.value as TicketPriority })
                      }
                      className="rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="urgent">P1 Urgent</option>
                      <option value="high">P2 High</option>
                      <option value="medium">P3 Medium</option>
                      <option value="low">P4 Low</option>
                    </select>

                    <select
                      aria-label="Assignee"
                      value={detail.assignee}
                      onChange={(e) => handleTicketFieldUpdate({ assignee: e.target.value })}
                      className="hidden sm:block rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                    >
                      {AGENTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>

                    {detail.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => handleTicketFieldUpdate({ status: 'resolved' })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-xs font-semibold text-[#047857] hover:bg-[#D1FAE5] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </header>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3.5">
                {detail.messages.map((msg) => {
                  const isInternal = msg.sender_type === 'internal';
                  const isAgent = msg.sender_type === 'agent';
                  return (
                    <article
                      key={msg.id}
                      className={`rounded-xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${
                        isInternal
                          ? 'border-[#FDE68A] bg-[#FEFCE8]'
                          : isAgent
                            ? 'border-[#DBEAFE] bg-[#F8FAFF]'
                            : 'border-[#E2E8F0] bg-white'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                              isInternal
                                ? 'bg-[#FEF08A] text-[#854D0E]'
                                : isAgent
                                  ? 'bg-[#2563EB] text-white'
                                  : 'bg-[#0F172A] text-white'
                            }`}
                          >
                            {msg.sender_name
                              .split(' ')
                              .map((p) => p[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-[#0F172A]">
                            {msg.sender_name}
                          </span>
                          <span className="text-[11px] text-[#64748B]">
                            {isInternal ? (
                              <span className="inline-flex items-center gap-1 font-medium text-[#A16207]">
                                <Lock className="h-3 w-3" />
                                Internal Agent Note
                              </span>
                            ) : isAgent ? (
                              'Operations Engineer'
                            ) : (
                              detail.customer_company
                            )}
                          </span>
                        </div>
                        <time className="text-[11px] text-[#64748B] tabular-nums">
                          {formatRelativeTime(msg.created_at)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#1E293B]">
                        {msg.body}
                      </p>
                    </article>
                  );
                })}
              </div>

              {/* Reply & Internal Note Composer */}
              <div className="border-t border-[#E2E8F0] bg-white p-4">
                {appliedBanner && (
                  <div className="mb-2.5 flex items-center justify-between rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-3 py-1.5 text-xs text-[#6D28D9]">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Sparkles className="h-3.5 w-3.5" />
                      {appliedBanner}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppliedBanner('')}
                      className="text-[#6D28D9] hover:text-[#4C1D95]"
                      aria-label="Dismiss notice"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded-lg bg-[#F1F5F9] p-1">
                    <button
                      type="button"
                      onClick={() => setComposerMode('agent')}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        composerMode === 'agent'
                          ? 'bg-white text-[#0F172A] shadow-xs'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      Public Reply
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('internal')}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        composerMode === 'internal'
                          ? 'bg-[#FEF9C3] text-[#854D0E] shadow-xs'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <Lock className="h-3 w-3" />
                      Internal Note
                    </button>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMacroMenu((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] transition-colors cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5 text-[#2563EB]" />
                      Macros
                    </button>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => runAICopilot()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] px-2.5 py-1.5 text-xs font-semibold text-[#6D28D9] hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {aiLoading ? 'Drafting...' : 'AI Draft'}
                    </button>

                    {showMacroMenu && (
                      <div className="absolute bottom-10 right-0 z-20 w-72 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.12)]">
                        <div className="px-2.5 py-1.5 text-[11px] font-semibold text-[#64748B]">
                          Insert Published Macro
                        </div>
                        {publishedMacros.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleInsertMacro(m)}
                            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs hover:bg-[#F1F5F9] cursor-pointer"
                          >
                            <span className="truncate font-medium text-[#0F172A]">{m.title}</span>
                            <span className="ml-2 font-mono text-[10px] text-[#64748B] shrink-0">
                              {m.macro_shortcut}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    composerMode === 'internal'
                      ? 'Add an internal engineering note visible only to your team...'
                      : `Write a response to ${detail.customer_name}...`
                  }
                  className={`w-full resize-none rounded-lg border px-3.5 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-3 ${
                    composerMode === 'internal'
                      ? 'border-[#FDE047] bg-[#FEFCE8] focus:border-[#CA8A04] focus:ring-[#EAB308]/20'
                      : 'border-[#E2E8F0] bg-white focus:border-[#2563EB] focus:ring-[#2563EB]/15'
                  }`}
                />

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#64748B]">
                    {composerMode === 'internal'
                      ? 'Saved privately to ticket timeline'
                      : `Replying via ${detail.channel} as ${defaultAgent}`}
                  </span>
                  <div className="flex items-center gap-2">
                    {composerMode === 'agent' && detail.status !== 'resolved' && (
                      <button
                        type="button"
                        disabled={sending || !replyText.trim()}
                        onClick={() => handleSendMessage(true)}
                        className="rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#F1F5F9] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Send & Resolve
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={sending || !replyText.trim()}
                      onClick={() => handleSendMessage(false)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer ${
                        composerMode === 'internal'
                          ? 'bg-[#0F172A] hover:bg-[#1E293B]'
                          : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {sending
                        ? 'Saving...'
                        : composerMode === 'internal'
                          ? 'Post Note'
                          : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Desktop AI Copilot Context Sidebar (40%) */}
        <aside className="hidden w-[380px] shrink-0 border-l border-[#E2E8F0] xl:block 2xl:w-[420px]">
          {copilotPanelContent}
        </aside>
      </div>

      {/* Tablet Sliding AI Copilot Contextual Sheet */}
      {mobileCopilotOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#0F172A]/40 xl:hidden">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                <Sparkles className="h-4 w-4 text-[#7C3AED]" />
                AI Copilot & Context
              </span>
              <button
                type="button"
                onClick={() => setMobileCopilotOpen(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{copilotPanelContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
