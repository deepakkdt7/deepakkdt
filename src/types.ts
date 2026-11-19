export type TicketStatus = 'open' | 'in_progress' | 'urgent' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketSentiment = 'positive' | 'neutral' | 'frustrated' | 'critical';
export type MessageSenderType = 'customer' | 'agent' | 'internal' | 'ai';
export type CustomerTier = 'Enterprise' | 'Mid-Market' | 'Growth';

export interface Customer {
  id: number;
  name: string;
  company: string;
  email: string;
  tier: CustomerTier;
  arr: number;
  sla_tier: string;
  health_score: number;
  avatar_initials: string;
  open_tickets?: number;
  total_tickets?: number;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_code: string;
  subject: string;
  customer_id: number;
  customer_name: string;
  customer_company: string;
  customer_email: string;
  customer_tier: CustomerTier;
  customer_sla_tier: string;
  customer_arr: number;
  customer_initials: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  channel: string;
  assignee: string;
  sentiment: TicketSentiment;
  ai_confidence: number;
  ai_summary: string;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message_preview?: string;
}

export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender_type: MessageSenderType;
  sender_name: string;
  body: string;
  created_at: string;
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
}

export interface KBArticle {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  macro_shortcut: string;
  status: 'published' | 'draft';
  usage_count: number;
  updated_at: string;
}

export interface AutomationRule {
  id: number;
  name: string;
  trigger_keyword: string;
  target_category: string;
  target_priority: TicketPriority;
  auto_draft: number;
  confidence_threshold: number;
  enabled: number;
  executions_count: number;
  created_at: string;
}

export interface AISuggestionResult {
  draftReply: string;
  summary: string;
  sentiment: TicketSentiment;
  intent: string;
  confidence: number;
  resolutionSteps: string[];
  citedArticles: Array<{ id: number; title: string; macro_shortcut: string }>;
  model: string;
  generatedAt: string;
}

export interface AIClassifyResult {
  category: string;
  priority: TicketPriority;
  sentiment: TicketSentiment;
  confidence: number;
  suggestedSummary: string;
  draftReply: string;
  matchedRules: Array<{ id: number; name: string; target_category: string; target_priority: string }>;
  citedArticles: Array<{ id: number; title: string; macro_shortcut: string }>;
  model: string;
}

export interface OverviewData {
  kpis: {
    openCount: number;
    urgentCount: number;
    resolvedCount: number;
    totalCount: number;
    slaCompliance: number;
    aiAssistRate: number;
    avgConfidence: number;
    medianFirstResponseMins: number;
  };
  volumeTrend: Array<{ day: string; incoming: number; aiAssisted: number; resolved: number }>;
  byCategory: Array<{ name: string; count: number }>;
  byPriority: Array<{ name: string; count: number }>;
  urgentWatchlist: Ticket[];
  recentActivity: Array<{
    id: number;
    ticket_id: number;
    ticket_code: string;
    subject: string;
    sender_type: MessageSenderType;
    sender_name: string;
    body: string;
    created_at: string;
  }>;
}

export interface AnalyticsData {
  slaByPriority: Array<{ priority: string; total: number; withinSla: number; rate: number }>;
  sentimentBreakdown: Array<{ sentiment: string; count: number }>;
  agentPerformance: Array<{
    agent: string;
    assigned: number;
    resolved: number;
    avgConfidence: number;
  }>;
  channelMix: Array<{ channel: string; count: number }>;
  topMacros: Array<{ id: number; title: string; macro_shortcut: string; usage_count: number }>;
}

export interface WorkspaceSettings {
  workspaceName: string;
  defaultSlaHoursUrgent: string;
  defaultSlaHoursHigh: string;
  defaultSlaHoursMedium: string;
  defaultAgentName: string;
  aiAutoSuggest: string;
  aiDefaultTone: string;
  agentSignature: string;
}

export interface BackendHealth {
  status: 'connected' | 'error';
  engine: string;
  dbPath: string;
  latencyMs: number;
  geminiConfigured: boolean;
  timestamp: string;
  tables: {
    customers: number;
    tickets: number;
    messages: number;
    kb_articles: number;
    automation_rules: number;
  };
}
