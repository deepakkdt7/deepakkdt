import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Customer, Ticket } from '../types';
import { api } from '../api';

interface NewTicketModalProps {
  customers: Customer[];
  defaultAgent: string;
  onClose: () => void;
  onCreated: (ticket: Ticket) => void;
}

const CATEGORIES = [
  'API & Webhooks',
  'Authentication',
  'Billing & Usage',
  'Data Pipeline',
  'Security & Compliance',
  'Permissions & RBAC',
  'Integrations',
  'Infrastructure',
];

const AGENTS = ['Elena Rostova', 'Daniel Cho', 'Priya Nair'];

export function NewTicketModal({
  customers,
  defaultAgent,
  onClose,
  onCreated,
}: NewTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [customerId, setCustomerId] = useState<number>(customers[0]?.id || 1);
  const [priority, setPriority] = useState('high');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [channel, setChannel] = useState('Enterprise Portal');
  const [assignee, setAssignee] = useState(defaultAgent || AGENTS[0]);
  const [initialMessage, setInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please enter a ticket subject.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await api.createTicket({
        subject: subject.trim(),
        customer_id: customerId,
        priority,
        category,
        channel,
        assignee,
        initialMessage:
          initialMessage.trim() ||
          `Customer reported: ${subject.trim()}. Please triage and verify root cause.`,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-ticket-title"
        className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_20px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.04)]"
      >
        <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
          <div>
            <h2 id="new-ticket-title" className="text-base font-semibold text-[#0F172A]">
              Create Operations Ticket
            </h2>
            <p className="text-xs text-[#64748B]">
              Persist a new customer incident directly to the SQLite queue
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#334155]">
              Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., SAML assertion failing for US-West production workspace"
              className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Customer Account
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(Number(e.target.value))}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              >
                <option value="urgent">P1 Urgent (1h SLA)</option>
                <option value="high">P2 High (4h SLA)</option>
                <option value="medium">P3 Medium (8h SLA)</option>
                <option value="low">P4 Low (8h SLA)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              >
                <option value="Enterprise Portal">Enterprise Portal</option>
                <option value="Slack Connect">Slack Connect</option>
                <option value="Email">Email</option>
                <option value="API Alert">API Alert</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#334155]">
                Assignee
              </label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
              >
                {AGENTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#334155]">
              Initial Customer Message
            </label>
            <textarea
              rows={4}
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Paste the customer's reported issue, error codes, or log context..."
              className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-[#E2E8F0] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors whitespace-nowrap"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
