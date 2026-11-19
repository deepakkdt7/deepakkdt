import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, Save, Search, Sparkles, Trash2 } from 'lucide-react';
import { api, formatRelativeTime } from '../api';
import type { KBArticle } from '../types';

interface KnowledgeBaseScreenProps {
  articles: KBArticle[];
  onArticlesChanged: () => Promise<void>;
}

const CATEGORIES = [
  'API & Webhooks',
  'Authentication',
  'Billing & Usage',
  'Data Pipeline',
  'Security & Compliance',
  'Permissions & RBAC',
  'Integrations',
];

export function KnowledgeBaseScreen({
  articles,
  onArticlesChanged,
}: KnowledgeBaseScreenProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(articles[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  const active = useMemo(
    () => articles.find((a) => a.id === selectedId) || articles[0] || null,
    [articles, selectedId]
  );

  const [title, setTitle] = useState(active?.title || '');
  const [category, setCategory] = useState(active?.category || CATEGORIES[0]);
  const [macroShortcut, setMacroShortcut] = useState(active?.macro_shortcut || '/new-macro');
  const [summary, setSummary] = useState(active?.summary || '');
  const [content, setContent] = useState(active?.content || '');
  const [status, setStatus] = useState<'published' | 'draft'>(active?.status || 'published');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  function loadIntoEditor(art: KBArticle) {
    setCreating(false);
    setSelectedId(art.id);
    setTitle(art.title);
    setCategory(art.category);
    setMacroShortcut(art.macro_shortcut);
    setSummary(art.summary);
    setContent(art.content);
    setStatus(art.status);
    setFeedback('');
  }

  function startNewArticle() {
    setCreating(true);
    setSelectedId(null);
    setTitle('');
    setCategory(CATEGORIES[0]);
    setMacroShortcut('/custom-runbook');
    setSummary('');
    setContent('');
    setStatus('published');
    setFeedback('');
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.macro_shortcut.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q)
    );
  }, [articles, search]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    setFeedback('');
    try {
      if (creating || !active) {
        const created = await api.createKBArticle({
          title,
          category,
          summary,
          content,
          macro_shortcut: macroShortcut,
          status,
        });
        await onArticlesChanged();
        setCreating(false);
        setSelectedId(created.id);
        setFeedback('Article published and indexed for AI Copilot grounding.');
      } else {
        await api.updateKBArticle(active.id, {
          title,
          category,
          summary,
          content,
          macro_shortcut: macroShortcut,
          status,
        });
        await onArticlesChanged();
        setFeedback('Changes persisted to SQLite Knowledge Base.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!active || creating) return;
    await api.deleteKBArticle(active.id);
    await onArticlesChanged();
    const remaining = articles.filter((a) => a.id !== active.id);
    if (remaining[0]) {
      loadIntoEditor(remaining[0]);
    } else {
      startNewArticle();
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Knowledge Base & AI Macros
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">
              Published playbooks are automatically supplied to Gemini Copilot for grounded reply synthesis
            </p>
          </div>
          <button
            type="button"
            onClick={startNewArticle}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Playbook
          </button>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Article Catalog */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] lg:col-span-5">
            <div className="border-b border-[#E2E8F0] p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search articles or /macro shortcuts..."
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-9 pr-3 text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
                />
              </div>
            </div>

            <div className="divide-y divide-[#F1F5F9] max-h-[620px] overflow-y-auto">
              {filtered.map((art) => {
                const isSelected = !creating && active?.id === art.id;
                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => loadIntoEditor(art)}
                    className={`block w-full px-4 py-3.5 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#F1F5F9] shadow-[inset_3px_0_0_#2563EB]'
                        : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-semibold text-[#7C3AED]">
                        {art.macro_shortcut}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          art.status === 'published'
                            ? 'bg-[#ECFDF5] text-[#047857]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {art.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">{art.title}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#64748B]">
                      <span>{art.category}</span>
                      <span className="tabular-nums">
                        {art.usage_count} uses · {formatRelativeTime(art.updated_at)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editor Pane */}
          <div className="lg:col-span-7">
            <form
              onSubmit={handleSave}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-[0_1px_3px_0_rgba(15,23,42,0.05)] space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[#2563EB]" />
                  <h2 className="text-base font-semibold text-[#0F172A]">
                    {creating ? 'Create Knowledge Base Playbook' : 'Edit Playbook & Macro'}
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EDE9FE] px-2.5 py-1 text-[11px] font-semibold text-[#6D28D9]">
                  <Sparkles className="h-3 w-3" />
                  Synced with AI Copilot
                </span>
              </div>

              {feedback && (
                <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs font-medium text-[#047857]">
                  {feedback}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Webhook HMAC Signature & Ingress Header Allowlist"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#0F172A]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Macro Shortcut</label>
                  <input
                    required
                    value={macroShortcut}
                    onChange={(e) => setMacroShortcut(e.target.value)}
                    placeholder="/webhook-hmac"
                    className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 font-mono text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#334155]">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#0F172A]"
                  >
                    <option value="published">Published (Live in AI)</option>
                    <option value="draft">Draft (Internal Only)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">
                  Short Summary
                </label>
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="One-line overview for rapid agent scanning"
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#334155]">
                  Resolution Playbook & Macro Body
                </label>
                <textarea
                  required
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write exact diagnostic steps, headers, or policies..."
                  className="w-full resize-none rounded-lg border border-[#E2E8F0] px-3.5 py-2.5 text-sm leading-relaxed text-[#1E293B] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-[#2563EB]/15"
                />
              </div>

              <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-4">
                {!creating && active ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Article
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E293B] disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : creating ? 'Publish Playbook' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
