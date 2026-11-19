import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  Sparkles,
  Ticket as TicketIcon,
  X,
} from 'lucide-react';
import { api } from './api';
import type {
  AutomationRule,
  Customer,
  KBArticle,
  Ticket,
  WorkspaceSettings,
} from './types';
import { InboxScreen } from './screens/InboxScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { TicketsScreen } from './screens/TicketsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { KnowledgeBaseScreen } from './screens/KnowledgeBaseScreen';
import { AIStudioScreen } from './screens/AIStudioScreen';
import { AnalyticsSettingsScreen } from './screens/AnalyticsSettingsScreen';
import { NewTicketModal } from './components/NewTicketModal';

type ScreenId =
  | 'inbox'
  | 'overview'
  | 'tickets'
  | 'customers'
  | 'kb'
  | 'ai_studio'
  | 'analytics';

const NAV_ITEMS: Array<{
  id: ScreenId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isAi?: boolean;
}> = [
  { id: 'inbox', label: 'Unified Inbox', icon: Inbox },
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tickets', label: 'All Tickets', icon: TicketIcon },
  { id: 'customers', label: 'Customers', icon: Building2 },
  { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
  { id: 'ai_studio', label: 'AI Studio', icon: Sparkles, isAi: true },
  { id: 'analytics', label: 'SLA & Settings', icon: BarChart3 },
];

const DEFAULT_SETTINGS: WorkspaceSettings = {
  workspaceName: 'AI Assist Enterprise Operations',
  defaultSlaHoursUrgent: '1',
  defaultSlaHoursHigh: '4',
  defaultSlaHoursMedium: '8',
  defaultAgentName: 'Elena Rostova',
  aiAutoSuggest: 'true',
  aiDefaultTone: 'Professional & Technical',
  agentSignature: 'Best regards,\nElena Rostova — Senior Operations Engineer, AI Assist',
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('inbox');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [kbArticles, setKbArticles] = useState<KBArticle[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings>(DEFAULT_SETTINGS);

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadAllData = useCallback(async () => {
    try {
      setLoadError('');
      const [t, c, kb, r, s] = await Promise.all([
        api.getTickets(),
        api.getCustomers(),
        api.getKBArticles(),
        api.getAutomations(),
        api.getSettings(),
      ]);
      setTickets(t);
      setCustomers(c);
      setKbArticles(kb);
      setRules(r);
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setSelectedTicketId((prev) => (prev && t.some((x) => x.id === prev) ? prev : t[0]?.id ?? null));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to connect to AI Assist backend');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const refreshTickets = useCallback(async () => {
    const t = await api.getTickets();
    setTickets(t);
  }, []);

  const refreshCustomers = useCallback(async () => {
    const [c, t] = await Promise.all([api.getCustomers(), api.getTickets()]);
    setCustomers(c);
    setTickets(t);
  }, []);

  const refreshKB = useCallback(async () => {
    const kb = await api.getKBArticles();
    setKbArticles(kb);
  }, []);

  const refreshRules = useCallback(async () => {
    const r = await api.getAutomations();
    setRules(r);
  }, []);

  function handleOpenTicketInInbox(id: number) {
    setSelectedTicketId(id);
    setActiveScreen('inbox');
  }

  const urgentCount = tickets.filter((t) => t.status === 'urgent').length;
  const openCount = tickets.filter((t) => t.status !== 'resolved').length;

  const navContent = (isCompact: boolean) => (
    <div className="flex h-full flex-col bg-[#0F172A] text-white select-none">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#2563EB] shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!isCompact && (
            <span className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              AI Assist
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setRailCollapsed((v) => !v)}
          aria-label={isCompact ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[#94A3B8] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          {isCompact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Primary Action */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => {
            setShowNewTicketModal(true);
            setMobileMenuOpen(false);
          }}
          title="New Ticket"
          className={`flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition-colors cursor-pointer ${
            isCompact ? 'px-2' : 'px-3'
          }`}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!isCompact && <span className="whitespace-nowrap">New Ticket</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-2.5 py-1 overflow-y-auto" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveScreen(item.id);
                setMobileMenuOpen(false);
              }}
              title={isCompact ? item.label : undefined}
              className={`group flex w-full items-center justify-between rounded-lg px-2.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? item.isAi
                    ? 'bg-[#7C3AED]/25 text-white ring-1 ring-[#8B5CF6]/40'
                    : 'bg-white/12 text-white'
                  : 'text-[#CBD5E1] hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    item.isAi
                      ? 'text-[#A78BFA]'
                      : isActive
                        ? 'text-white'
                        : 'text-[#94A3B8] group-hover:text-white'
                  }`}
                />
                {!isCompact && <span className="truncate whitespace-nowrap">{item.label}</span>}
              </span>

              {!isCompact && item.id === 'inbox' && openCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                    urgentCount > 0
                      ? 'bg-[#EF4444]/25 text-[#FCA5A5]'
                      : 'bg-white/15 text-[#E2E8F0]'
                  }`}
                >
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Active Operations Agent Footer */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-2.5 ${isCompact ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1E293B] border border-white/15 text-xs font-semibold text-white">
            {(settings.defaultAgentName || 'Elena Rostova')
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          {!isCompact && (
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {settings.defaultAgentName || 'Elena Rostova'}
              </p>
              <p className="truncate text-[11px] text-[#94A3B8]">Senior Ops Engineer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#F8FAFC] md:flex-row">
      {/* Mobile Top Bar */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-[#0F172A] px-4 text-white md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg p-1.5 text-[#CBD5E1] hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-bold tracking-tight">AI Assist</span>
        </div>
        <button
          type="button"
          onClick={() => setShowNewTicketModal(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </header>

      {/* Mobile Off-Canvas Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3.5 z-10 rounded-lg p-1 text-[#94A3B8] hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {navContent(false)}
          </div>
          <div
            className="flex-1 bg-[#0F172A]/45"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* TIER 1: Desktop & Tablet Vertical Navigation Rail */}
      <aside
        className={`hidden shrink-0 border-r border-[#1E293B] transition-[width] duration-150 md:block ${
          railCollapsed ? 'w-16' : 'w-16 lg:w-[228px]'
        }`}
      >
        <div className="h-full lg:hidden">{navContent(true)}</div>
        <div className="hidden h-full lg:block">{navContent(railCollapsed)}</div>
      </aside>

      {/* Main Content Stage */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {initialLoading ? (
          <div className="flex flex-1 items-center justify-center bg-[#F8FAFC]">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">Connecting to AI Assist Backend</p>
              <p className="text-xs text-[#64748B]">Loading live SQLite queues and playbooks...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border border-[#FECACA] bg-white p-6 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#B91C1C]">Backend Connection Error</p>
              <p className="mt-1 text-xs text-[#64748B]">{loadError}</p>
              <button
                type="button"
                onClick={loadAllData}
                className="mt-4 rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E293B] cursor-pointer"
              >
                Retry Connection
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeScreen === 'inbox' && (
              <InboxScreen
                tickets={tickets}
                kbArticles={kbArticles}
                selectedTicketId={selectedTicketId}
                defaultAgent={settings.defaultAgentName || 'Elena Rostova'}
                onSelectTicket={setSelectedTicketId}
                onTicketsChanged={refreshTickets}
                onOpenNewTicket={() => setShowNewTicketModal(true)}
              />
            )}

            {activeScreen === 'overview' && (
              <OverviewScreen
                onOpenTicket={handleOpenTicketInInbox}
                onOpenNewTicket={() => setShowNewTicketModal(true)}
                onNavigateTickets={() => setActiveScreen('tickets')}
              />
            )}

            {activeScreen === 'tickets' && (
              <TicketsScreen
                tickets={tickets}
                onOpenTicket={handleOpenTicketInInbox}
                onTicketsChanged={refreshTickets}
                onOpenNewTicket={() => setShowNewTicketModal(true)}
              />
            )}

            {activeScreen === 'customers' && (
              <CustomersScreen
                customers={customers}
                tickets={tickets}
                onCustomersChanged={refreshCustomers}
                onOpenTicket={handleOpenTicketInInbox}
              />
            )}

            {activeScreen === 'kb' && (
              <KnowledgeBaseScreen
                articles={kbArticles}
                onArticlesChanged={refreshKB}
              />
            )}

            {activeScreen === 'ai_studio' && (
              <AIStudioScreen
                rules={rules}
                onRulesChanged={refreshRules}
              />
            )}

            {activeScreen === 'analytics' && (
              <AnalyticsSettingsScreen
                settings={settings}
                onSettingsSaved={setSettings}
                onDataReset={loadAllData}
              />
            )}
          </>
        )}
      </main>

      {/* Global New Ticket Modal */}
      {showNewTicketModal && customers.length > 0 && (
        <NewTicketModal
          customers={customers}
          defaultAgent={settings.defaultAgentName || 'Elena Rostova'}
          onClose={() => setShowNewTicketModal(false)}
          onCreated={async (created) => {
            setShowNewTicketModal(false);
            await refreshTickets();
            setSelectedTicketId(created.id);
            setActiveScreen('inbox');
          }}
        />
      )}
    </div>
  );
}
