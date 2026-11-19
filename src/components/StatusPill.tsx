import type { TicketPriority, TicketSentiment, TicketStatus } from '../types';

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config: Record<TicketStatus, { label: string; className: string }> = {
    urgent: {
      label: 'Urgent',
      className: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
    },
    in_progress: {
      label: 'In Progress',
      className: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
    },
    open: {
      label: 'Open',
      className: 'bg-[#EFF4FF] text-[#1D4ED8] border border-[#BFDBFE]',
    },
    resolved: {
      label: 'Resolved',
      className: 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]',
    },
  };
  const item = config[status] || config.open;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] whitespace-nowrap shrink-0 ${item.className}`}
    >
      {item.label}
    </span>
  );
}

export function PriorityText({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, { label: string; cls: string }> = {
    urgent: { label: 'P1 Urgent', cls: 'text-[#B91C1C] font-semibold' },
    high: { label: 'P2 High', cls: 'text-[#B45309] font-semibold' },
    medium: { label: 'P3 Medium', cls: 'text-[#334155] font-medium' },
    low: { label: 'P4 Low', cls: 'text-[#64748B] font-medium' },
  };
  const item = map[priority] || map.medium;
  return <span className={`text-xs whitespace-nowrap ${item.cls}`}>{item.label}</span>;
}

export function SentimentLabel({ sentiment }: { sentiment: TicketSentiment }) {
  const map: Record<TicketSentiment, { label: string; cls: string }> = {
    critical: { label: 'Critical', cls: 'text-[#B91C1C]' },
    frustrated: { label: 'Frustrated', cls: 'text-[#B45309]' },
    neutral: { label: 'Neutral', cls: 'text-[#475569]' },
    positive: { label: 'Positive', cls: 'text-[#047857]' },
  };
  const item = map[sentiment] || map.neutral;
  return <span className={`text-xs font-medium whitespace-nowrap ${item.cls}`}>{item.label}</span>;
}
