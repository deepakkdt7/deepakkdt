import type {
  AIClassifyResult,
  AISuggestionResult,
  AnalyticsData,
  AutomationRule,
  BackendHealth,
  Customer,
  KBArticle,
  OverviewData,
  Ticket,
  TicketDetail,
  TicketMessage,
  WorkspaceSettings,
} from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getHealth: () => request<BackendHealth>('/api/health'),
  getOverview: () => request<OverviewData>('/api/overview'),

  getTickets: (params?: { status?: string; priority?: string; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'all') qs.set('status', params.status);
    if (params?.priority && params.priority !== 'all') qs.set('priority', params.priority);
    if (params?.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Ticket[]>(`/api/tickets${suffix}`);
  },

  getTicketDetail: (id: number) => request<TicketDetail>(`/api/tickets/${id}`),

  createTicket: (payload: {
    subject: string;
    customer_id: number;
    priority: string;
    category: string;
    channel: string;
    assignee: string;
    initialMessage: string;
  }) =>
    request<Ticket>('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTicket: (id: number, payload: Partial<Ticket>) =>
    request<Ticket>(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  bulkUpdateTickets: (payload: { ids: number[]; status?: string; assignee?: string; priority?: string }) =>
    request<{ updated: number }>('/api/tickets/bulk', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTicket: (id: number) =>
    request<{ deleted: boolean; id: number }>(`/api/tickets/${id}`, {
      method: 'DELETE',
    }),

  sendMessage: (
    ticketId: number,
    payload: {
      sender_type: 'agent' | 'internal' | 'customer';
      sender_name: string;
      body: string;
      resolveAfterSend?: boolean;
    }
  ) =>
    request<{ message: TicketMessage; ticket: Ticket }>(`/api/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCustomers: () => request<Customer[]>('/api/customers'),

  createCustomer: (payload: {
    name: string;
    company: string;
    email: string;
    tier: string;
    arr: number;
    sla_tier: string;
    health_score: number;
  }) =>
    request<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCustomer: (id: number, payload: Partial<Customer>) =>
    request<Customer>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteCustomer: (id: number) =>
    request<{ deleted: boolean }>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),

  getKBArticles: () => request<KBArticle[]>('/api/kb'),

  createKBArticle: (payload: {
    title: string;
    category: string;
    summary: string;
    content: string;
    macro_shortcut: string;
    status: 'published' | 'draft';
  }) =>
    request<KBArticle>('/api/kb', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateKBArticle: (id: number, payload: Partial<KBArticle> & { incrementUsage?: boolean }) =>
    request<KBArticle>(`/api/kb/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteKBArticle: (id: number) =>
    request<{ deleted: boolean }>(`/api/kb/${id}`, {
      method: 'DELETE',
    }),

  getAutomations: () => request<AutomationRule[]>('/api/automations'),

  createAutomation: (payload: {
    name: string;
    trigger_keyword: string;
    target_category: string;
    target_priority: string;
    auto_draft: boolean;
    confidence_threshold: number;
  }) =>
    request<AutomationRule>('/api/automations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAutomation: (id: number, payload: Partial<AutomationRule>) =>
    request<AutomationRule>(`/api/automations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteAutomation: (id: number) =>
    request<{ deleted: boolean }>(`/api/automations/${id}`, {
      method: 'DELETE',
    }),

  getAnalytics: () => request<AnalyticsData>('/api/analytics'),
  getSettings: () => request<WorkspaceSettings>('/api/settings'),
  saveSettings: (payload: Partial<WorkspaceSettings>) =>
    request<WorkspaceSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  reseedDatabase: () =>
    request<{ reseeded: boolean }>('/api/admin/reseed', {
      method: 'POST',
    }),

  exportDatabase: () => request<Record<string, unknown>>('/api/admin/export'),

  generateAISuggestion: (payload: {
    ticketId: number;
    tone?: string;
    customInstruction?: string;
  }) =>
    request<AISuggestionResult>('/api/ai/suggest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  classifyInquiry: (inquiryText: string) =>
    request<AIClassifyResult>('/api/ai/classify', {
      method: 'POST',
      body: JSON.stringify({ inquiryText }),
    }),
};

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatSlaCountdown(slaDueAt: string, status: string): {
  label: string;
  breached: boolean;
  atRisk: boolean;
} {
  if (status === 'resolved') {
    return { label: 'Met', breached: false, atRisk: false };
  }
  const diffMins = Math.round((new Date(slaDueAt).getTime() - Date.now()) / 60000);
  if (diffMins <= 0) {
    return { label: `-${Math.abs(diffMins)}m`, breached: true, atRisk: true };
  }
  if (diffMins < 60) {
    return { label: `${diffMins}m left`, breached: false, atRisk: diffMins <= 45 };
  }
  const hrs = Math.floor(diffMins / 60);
  const rem = diffMins % 60;
  return { label: `${hrs}h ${rem}m`, breached: false, atRisk: false };
}
