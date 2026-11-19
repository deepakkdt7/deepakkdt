import React, { useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Code2,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../api';
import type { AIClassifyResult, AutomationRule, TicketPriority } from '../types';
import { PriorityText, SentimentLabel } from '../components/StatusPill';

interface AIStudioScreenProps {
  rules: AutomationRule[];
  onRulesChanged: () => Promise<void>;
}

const SAMPLE_INQUIRY =
  'Urgent: Our production payment webhooks started returning 403 Invalid Signature right after we rotated our edge TLS proxy certificate. Can you confirm which X-AI headers must be forwarded and whether dual-secret grace mode is available?';

export function AIStudioScreen({ rules, onRulesChanged }: AIStudioScreenProps) {
  const [inquiryText, setInquiryText] = useState(SAMPLE_INQUIRY);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<AIClassifyResult | null>(null);
  const [error, setError] = useState('');
  const [showJson, setShowJson] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [targetCategory, setTargetCategory] = useState('API & Webhooks');
  const [targetPriority, setTargetPriority] = useState<TicketPriority>('high');
  const [threshold, setThreshold] = useState('85');
  const [autoDraft, setAutoDraft] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  async function handleRunSandbox(e: React.FormEvent) {
    e.preventDefault();
    if (!inquiryText.trim()) return;
    setTesting(true);
    setError('');
    try {
      const res = await api.classifyInquiry(inquiryText);
      setResult(res);
      await onRulesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleToggleRule(rule: AutomationRule) {
    await api.updateAutomation(rule.id, { enabled: rule.enabled ? 0 : 1 });
    await onRulesChanged();
  }

  async function handleDeleteRule(id: number) {
    await api.deleteAutomation(id);
    await onRulesChanged();
  }

  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !triggerKeyword.trim()) return;
    setSavingRule(true);
    try {
      await api.createAutomation({
        name,
        trigger_keyword: triggerKeyword,
        target_category: targetCategory,
        target_priority: targetPriority,
        auto_draft: autoDraft,
        confidence_threshold: Number(threshold) || 85,
      });
      await onRulesChanged();
      setShowModal(false);
      setName('');
      setTriggerKeyword('');
    } finally {
      setSavingRule(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              AI Copilot Studio & Triage Rules
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              Configure automated classification thresholds and test live Gemini triage against your SQLite ruleset
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="ai-action-btn inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Routing Rule
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Persisted Automation Rules */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-6">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-[#0F172A]">
                  Active Routing & Auto-Draft Policies
                </h2>
                <p className="text-xs text-[#64748B] tabular-nums">
                  {rules.filter((r) => r.enabled === 1).length} of {rules.length} rules enabled
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9]">
              {rules.map((rule) => (
                <div key={rule.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0F172A]">{rule.name}</h3>
                        {rule.auto_draft === 1 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[10px] font-semibold text-[#6D28D9]">
                            <Sparkles className="h-2.5 w-2.5" />
                            Auto-Draft
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[11px] text-[#475569]">
                        Triggers: {rule.trigger_keyword}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                        <span className="font-medium text-[#0F172A]">{rule.target_category}</span>
                        <span aria-hidden="true">·</span>
                        <PriorityText priority={rule.target_priority} />
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Min {rule.confidence_threshold}% conf
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{rule.executions_count} runs</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.enabled === 1}
                        onClick={() => handleToggleRule(rule)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                          rule.enabled === 1 ? 'bg-[#7C3AED]' : 'bg-[#CBD5E1]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            rule.enabled === 1 ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        aria-label={`Delete ${rule.name}`}
                        className="rounded-md p-1 text-[#94A3B8] hover:bg-[#FEF2F2] hover:text-[#B91C1C] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Live Gemini Triage Sandbox */}
          <section className="ai-glass-card rounded-2xl p-5 lg:col-span-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EDE9FE] text-[#7C3AED]">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    Live Gemini Triage Simulator
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Evaluates incoming messages against active SQLite rules & published KB
                  </p>
                </div>
              </div>
              {result && (
                <button
                  type="button"
                  onClick={() => setShowJson((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DDD6FE] bg-white px-2.5 py-1 text-[11px] font-medium text-[#6D28D9] hover:bg-[#F5F3FF] cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {showJson ? 'Visual View' : 'JSON Payload'}
                </button>
              )}
            </div>

            <form onSubmit={handleRunSandbox} className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-[#334155]">
                Simulated Customer Inquiry
              </label>
              <textarea
                rows={4}
                value={inquiryText}
                onChange={(e) => setInquiryText(e.target.value)}
                className="w-full resize-none rounded-lg border border-[#DDD6FE] bg-white px-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#7C3AED] focus:outline-none focus:ring-3 focus:ring-[#7C3AED]/20"
              />
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setInquiryText(
                      'Our Okta IdP certificate expired this morning and 85 engineers in EU-Central are locked out with SAML_ACS_SIGNATURE_MISMATCH.'
                    )
                  }
                  className="text-xs font-medium text-[#6D28D9] hover:underline cursor-pointer"
                >
                  Load SAML Outage Sample
                </button>
                <button
                  type="submit"
                  disabled={testing || !inquiryText.trim()}
                  className="ai-action-btn inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 cursor-pointer"
                >
                  {testing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {testing ? 'Evaluating...' : 'Run Live Triage'}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {result && (
              <div className="mt-5 border-t border-[#EDE9FE] pt-4">
                {showJson ? (
                  <pre className="max-h-80 overflow-auto rounded-xl bg-[#0F172A] p-4 font-mono text-[11px] leading-relaxed text-[#E2E8F0]">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                        <span className="text-[11px] text-[#64748B]">Category</span>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#0F172A]">
                          {result.category}
                        </p>
                      </div>
                      <div className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                        <span className="text-[11px] text-[#64748B]">Priority</span>
                        <div className="mt-0.5">
                          <PriorityText priority={result.priority} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#E2E8F0] bg-white p-2.5">
                        <span className="text-[11px] text-[#64748B]">Sentiment</span>
                        <div className="mt-0.5">
                          <SentimentLabel sentiment={result.sentiment} />
                        </div>
                      </div>
                      <div className="rounded-lg border border-[#DDD6FE] bg-[#F5F3FF] p-2.5">
                        <span className="text-[11px] text-[#6D28D9]">Confidence</span>
                        <p className="mt-0.5 font-mono text-xs font-bold text-[#6D28D9] tabular-nums">
                          {result.confidence}%
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3">
                      <span className="text-[11px] font-semibold text-[#64748B]">
                        Executive Triage Summary
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-[#1E293B]">
                        {result.suggestedSummary}
                      </p>
                    </div>

                    {result.matchedRules.length > 0 && (
                      <div>
                        <span className="mb-1.5 block text-[11px] font-semibold text-[#64748B]">
                          Triggered Routing Rules
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.matchedRules.map((mr) => (
                            <span
                              key={mr.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-0.5 text-[11px] font-semibold text-[#6D28D9]"
                            >
                              <Sparkles className="h-3 w-3" />
                              {mr.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.citedArticles.length > 0 && (
                      <div>
                        <span className="mb-1.5 block text-[11px] font-semibold text-[#64748B]">
                          Grounded Knowledge Base Articles
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {result.citedArticles.map((art) => (
                            <span
                              key={art.id}
                              className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[11px] font-medium text-[#334155]"
                            >
                              <BookOpen className="h-3 w-3 text-[#7C3AED]" />
                              {art.title}
                              <span className="font-mono text-[10px] text-[#64748B]">
                                {art.macro_shortcut}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="mb-1.5 block text-[11px] font-semibold text-[#64748B]">
                        Generated First Response
                      </span>
                      <div className="whitespace-pre-wrap rounded-lg border border-[#DDD6FE] bg-white p-3 text-xs leading-relaxed text-[#1E293B]">
                        {result.draftReply}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create Automation Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0F172A]">New AI Routing Rule</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="space-y-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Rule Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Enterprise API 5xx Escalation"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#7C3AED] focus:outline-none focus:ring-3 focus:ring-[#7C3AED]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">
                  Trigger Keywords (comma-separated)
                </label>
                <input
                  required
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value)}
                  placeholder="502, gateway timeout, outage, latency"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-xs focus:border-[#7C3AED] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Category</label>
                  <input
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Priority</label>
                  <select
                    value={targetPriority}
                    onChange={(e) => setTargetPriority(e.target.value as TicketPriority)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs"
                  >
                    <option value="urgent">P1 Urgent</option>
                    <option value="high">P2 High</option>
                    <option value="medium">P3 Medium</option>
                    <option value="low">P4 Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">
                    Confidence Threshold (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={99}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-xs"
                  />
                </div>
                <label className="mt-4 flex items-center gap-2 text-xs font-medium text-[#334155]">
                  <input
                    type="checkbox"
                    checked={autoDraft}
                    onChange={(e) => setAutoDraft(e.target.checked)}
                    className="h-4 w-4 rounded border-[#CBD5E1] text-[#7C3AED]"
                  />
                  Enable Auto-Draft
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-xs font-medium text-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRule}
                  className="ai-action-btn rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {savingRule ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
