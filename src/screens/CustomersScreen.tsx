import React, { useMemo, useState } from 'react';
import { Building2, Mail, Plus, Search, ShieldCheck, Ticket as TicketIcon, Trash2, X } from 'lucide-react';
import { api } from '../api';
import type { Customer, Ticket } from '../types';
import { StatusBadge } from '../components/StatusPill';

interface CustomersScreenProps {
  customers: Customer[];
  tickets: Ticket[];
  onCustomersChanged: () => Promise<void>;
  onOpenTicket: (id: number) => void;
}

export function CustomersScreen({
  customers,
  tickets,
  onCustomersChanged,
  onOpenTicket,
}: CustomersScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(customers[0]?.id ?? null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('Enterprise');
  const [arr, setArr] = useState('180000');
  const [slaTier, setSlaTier] = useState('Platinum 1h');
  const [healthScore, setHealthScore] = useState('90');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.company.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.tier.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const activeCustomer =
    filtered.find((c) => c.id === selectedId) || filtered[0] || customers[0] || null;

  const customerTickets = useMemo(() => {
    if (!activeCustomer) return [];
    return tickets.filter((t) => t.customer_id === activeCustomer.id);
  }, [tickets, activeCustomer]);

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await api.createCustomer({
        name,
        company,
        email,
        tier,
        arr: Number(arr) || 0,
        sla_tier: slaTier,
        health_score: Number(healthScore) || 85,
      });
      await onCustomersChanged();
      setSelectedId(created.id);
      setShowAddModal(false);
      setName('');
      setCompany('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer(id: number) {
    await api.deleteCustomer(id);
    await onCustomersChanged();
    setSelectedId(null);
  }

  const totalArr = customers.reduce((sum, c) => sum + c.arr, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Customer Accounts
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B] tabular-nums">
              {customers.length} organizations · ${(totalArr / 1000000).toFixed(2)}M combined ARR under SLA
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Accounts List */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-5">
            <div className="border-b border-[#E2E8F0] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search company, contact, tier..."
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9] max-h-[600px] overflow-y-auto">
              {filtered.map((c) => {
                const isSelected = activeCustomer?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F1F5F9] shadow-[inset_3px_0_0_#2563EB]'
                        : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-xs font-semibold text-white">
                        {c.avatar_initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{c.company}</p>
                        <p className="truncate text-xs text-[#64748B]">
                          {c.name} · {c.tier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-xs font-semibold text-[#0F172A] tabular-nums">
                        ${(c.arr / 1000).toFixed(0)}k
                      </p>
                      <p
                        className={`text-[11px] font-medium tabular-nums ${
                          c.health_score >= 85
                            ? 'text-[#047857]'
                            : c.health_score >= 70
                              ? 'text-[#B45309]'
                              : 'text-[#B91C1C]'
                        }`}
                      >
                        Health {c.health_score}%
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Detail Inspector */}
          <div className="lg:col-span-7">
            {activeCustomer ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F172A] text-sm font-semibold text-white">
                        {activeCustomer.avatar_initials}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F172A]">
                          {activeCustomer.company}
                        </h2>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                          <span>{activeCustomer.name}</span>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[#2563EB]">
                            <Mail className="h-3 w-3" />
                            {activeCustomer.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(activeCustomer.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#F1F5F9] pt-5 sm:grid-cols-4">
                    <div>
                      <span className="text-xs text-[#64748B]">Contract ARR</span>
                      <p className="mt-1 font-mono text-base font-bold text-[#0F172A] tabular-nums">
                        ${activeCustomer.arr.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748B]">Tier</span>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0F172A]">
                        <Building2 className="h-3.5 w-3.5 text-[#2563EB]" />
                        {activeCustomer.tier}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748B]">SLA Agreement</span>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#0F172A]">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#047857]" />
                        {activeCustomer.sla_tier}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-[#64748B]">Account Health</span>
                      <p className="mt-1 font-mono text-base font-bold text-[#0F172A] tabular-nums">
                        {activeCustomer.health_score}/100
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
                    <h3 className="text-sm font-semibold text-[#0F172A]">
                      Linked Tickets ({customerTickets.length})
                    </h3>
                    <span className="text-xs text-[#64748B]">Click to inspect in Inbox</span>
                  </div>

                  {customerTickets.length === 0 ? (
                    <div className="px-6 py-12 text-center text-xs text-[#64748B]">
                      No support incidents recorded for this account yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {customerTickets.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => onOpenTicket(t.id)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 text-xs text-[#64748B]">
                              <TicketIcon className="h-3.5 w-3.5 text-[#2563EB]" />
                              <span className="font-mono font-semibold text-[#0F172A]">
                                {t.ticket_code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{t.category}</span>
                            </div>
                            <p className="mt-0.5 truncate text-sm font-medium text-[#0F172A]">
                              {t.subject}
                            </p>
                          </div>
                          <StatusBadge status={t.status} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center text-sm text-[#64748B]">
                Select an account to view SLA and ticket details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0F172A]">Add Customer Account</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-4 p-6">
              {error && (
                <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                  {error}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Company Name</label>
                <input
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Cloud Corp"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Primary Contact</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jlee@acme.io"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm"
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Mid-Market">Mid-Market</option>
                    <option value="Growth">Growth</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">SLA Plan</label>
                  <select
                    value={slaTier}
                    onChange={(e) => setSlaTier(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm"
                  >
                    <option value="Platinum 1h">Platinum 1h</option>
                    <option value="Gold 4h">Gold 4h</option>
                    <option value="Standard 8h">Standard 8h</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Annual ARR ($)</label>
                  <input
                    type="number"
                    value={arr}
                    onChange={(e) => setArr(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Health Score (1-100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={healthScore}
                    onChange={(e) => setHealthScore(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-medium text-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
