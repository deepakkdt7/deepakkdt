import React, { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Database,
  Download,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Sparkles,
} from 'lucide-react';
import { api } from '../api';
import type { AnalyticsData, BackendHealth, WorkspaceSettings } from '../types';

interface AnalyticsSettingsScreenProps {
  settings: WorkspaceSettings;
  onSettingsSaved: (updated: WorkspaceSettings) => void;
  onDataReset: () => Promise<void>;
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#10B981',
  neutral: '#2563EB',
  frustrated: '#F59E0B',
  critical: '#EF4444',
};

export function AnalyticsSettingsScreen({
  settings,
  onSettingsSaved,
  onDataReset,
}: AnalyticsSettingsScreenProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [form, setForm] = useState<WorkspaceSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [reseeding, setReseeding] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  async function loadAll() {
    setCheckingHealth(true);
    try {
      const [a, h] = await Promise.all([api.getAnalytics(), api.getHealth()]);
      setAnalytics(a);
      setHealth(h);
    } finally {
      setCheckingHealth(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg('');
    try {
      const updated = await api.saveSettings(form);
      onSettingsSaved(updated);
      setSavedMsg('Workspace settings saved to SQLite database.');
    } finally {
      setSaving(false);
    }
  }

  async function handleExportJson() {
    const payload = await api.exportDatabase();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReseed() {
    setReseeding(true);
    try {
      await api.reseedDatabase();
      await onDataReset();
      await loadAll();
      setSavedMsg('Database reseeded with fresh enterprise sample records.');
    } finally {
      setReseeding(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              SLA Analytics & Backend Connectivity
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              Resolution telemetry, workspace policies, and live SQLite + Express API diagnostics
            </p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
            Refresh Diagnostics
          </button>
        </header>

        {/* Analytics Charts Row */}
        {analytics && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
              <h2 className="text-sm font-semibold text-[#0F172A]">SLA Adherence by Priority</h2>
              <p className="mb-4 text-xs text-[#64748B]">
                Percentage of tickets resolved or tracking within SLA target
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.slaByPriority} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="priority"
                      tick={{ fontSize: 12, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, 'Within SLA']}
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="rate" fill="#2563EB" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Customer Sentiment Distribution</h2>
              <p className="mb-4 text-xs text-[#64748B]">
                Detected tone across active and resolved support queues
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.sentimentBreakdown} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis
                      dataKey="sentiment"
                      tick={{ fontSize: 12, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]} barSize={36}>
                      {analytics.sentimentBreakdown.map((entry) => (
                        <Cell
                          key={entry.sentiment}
                          fill={SENTIMENT_COLORS[entry.sentiment] || '#2563EB'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Agent Performance & Top Macros */}
        {analytics && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Operations Engineer Throughput</h2>
              </div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F1F5F9] bg-[#F8FAFC] text-[11px] font-semibold text-[#475569]">
                    <th className="px-5 py-2.5">Engineer</th>
                    <th className="px-4 py-2.5 text-right">Assigned</th>
                    <th className="px-4 py-2.5 text-right">Resolved</th>
                    <th className="px-5 py-2.5 text-right">Avg AI Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {analytics.agentPerformance.map((row) => (
                    <tr key={row.agent}>
                      <td className="px-5 py-3 font-semibold text-[#0F172A]">{row.agent}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#334155]">
                        {row.assigned}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#047857] font-semibold">
                        {row.resolved}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-[#7C3AED] font-semibold">
                        {row.avgConfidence}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)]">
              <div className="border-b border-[#E2E8F0] px-5 py-4">
                <h2 className="text-sm font-semibold text-[#0F172A]">Most Applied Playbook Macros</h2>
              </div>
              <div className="divide-y divide-[#F1F5F9]">
                {analytics.topMacros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#0F172A]">{m.title}</p>
                      <p className="font-mono text-[11px] text-[#7C3AED]">{m.macro_shortcut}</p>
                    </div>
                    <span className="font-mono font-semibold text-[#334155] tabular-nums shrink-0">
                      {m.usage_count} uses
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Workspace Settings & Backend Database Connectivity */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Workspace Configuration Form */}
          <form
            onSubmit={handleSaveSettings}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] space-y-4 lg:col-span-7"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">Workspace & Copilot Preferences</h2>
              <p className="text-xs text-[#64748B]">
                Persisted directly to the <span className="font-mono">workspace_settings</span> table
              </p>
            </div>

            {savedMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs font-medium text-[#047857]">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{savedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Workspace Name</label>
                <input
                  value={form.workspaceName || ''}
                  onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Default Active Agent</label>
                <select
                  value={form.defaultAgentName || 'Elena Rostova'}
                  onChange={(e) => setForm({ ...form, defaultAgentName: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#0F172A]"
                >
                  <option value="Elena Rostova">Elena Rostova</option>
                  <option value="Daniel Cho">Daniel Cho</option>
                  <option value="Priya Nair">Priya Nair</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Urgent SLA (hrs)</label>
                <input
                  type="number"
                  value={form.defaultSlaHoursUrgent || '1'}
                  onChange={(e) => setForm({ ...form, defaultSlaHoursUrgent: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">High SLA (hrs)</label>
                <input
                  type="number"
                  value={form.defaultSlaHoursHigh || '4'}
                  onChange={(e) => setForm({ ...form, defaultSlaHoursHigh: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Default AI Tone</label>
                <select
                  value={form.aiDefaultTone || 'Professional & Technical'}
                  onChange={(e) => setForm({ ...form, aiDefaultTone: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs"
                >
                  <option value="Professional & Technical">Professional & Technical</option>
                  <option value="Empathetic & Executive">Empathetic & Executive</option>
                  <option value="Concise & Direct">Concise & Direct</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#334155]">Agent Reply Signature</label>
              <textarea
                rows={3}
                value={form.agentSignature || ''}
                onChange={(e) => setForm({ ...form, agentSignature: e.target.value })}
                className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>

          {/* Backend Data Connectivity Panel */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] space-y-4 lg:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[#2563EB]" />
                <h2 className="text-sm font-semibold text-[#0F172A]">Backend Data Connectivity</h2>
              </div>
              {health?.status === 'connected' && (
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                  Connected
                </span>
              )}
            </div>

            {health && (
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Storage Engine</span>
                    <span className="font-medium text-[#0F172A]">{health.engine}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Database File</span>
                    <span className="font-mono text-[11px] text-[#0F172A]">{health.dbPath}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B]">Query Latency</span>
                    <span className="font-mono font-semibold text-[#047857] tabular-nums">
                      {health.latencyMs} ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#64748B] inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-[#7C3AED]" />
                      Server Gemini API
                    </span>
                    <span
                      className={`font-semibold ${
                        health.geminiConfigured ? 'text-[#6D28D9]' : 'text-[#B45309]'
                      }`}
                    >
                      {health.geminiConfigured ? 'Ready (gemini-4-hydrogen)' : 'Key Required in Secrets'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-[11px] font-semibold text-[#64748B]">
                    Live SQLite Table Counts
                  </span>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {Object.entries(health.tables).map(([tbl, count]) => (
                      <div
                        key={tbl}
                        className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2"
                      >
                        <p className="font-mono text-[10px] text-[#64748B]">{tbl}</p>
                        <p className="mt-0.5 font-mono text-sm font-bold text-[#0F172A] tabular-nums">
                          {count}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export JSON
                  </button>
                  <button
                    type="button"
                    disabled={reseeding}
                    onClick={handleReseed}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#1E293B] hover:bg-[#F1F5F9] disabled:opacity-60 cursor-pointer"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${reseeding ? 'animate-spin' : ''}`} />
                    {reseeding ? 'Resetting...' : 'Reset Sample Data'}
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-[#EFF4FF] px-3 py-2 text-[11px] text-[#1D4ED8]">
                  <Server className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    All CRUD mutations persist across reloads via Express REST API at{' '}
                    <span className="font-mono">/api/*</span>.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
