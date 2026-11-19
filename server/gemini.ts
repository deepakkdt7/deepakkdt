import { GoogleGenAI, Type } from '@google/genai';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const AI_MODEL = 'gemini-4-hydrogen';

export interface SuggestInput {
  ticketCode: string;
  subject: string;
  category: string;
  priority: string;
  customerName: string;
  customerCompany: string;
  customerTier: string;
  messages: Array<{ sender_type: string; sender_name: string; body: string; created_at: string }>;
  kbArticles: Array<{ id: number; title: string; summary: string; content: string; macro_shortcut: string }>;
  tone?: string;
  customInstruction?: string;
  agentSignature?: string;
}

export async function generateCopilotSuggestion(input: SuggestInput) {
  const ai = getGeminiClient();

  const kbContext = input.kbArticles
    .map(
      (a) =>
        `[Article ID: ${a.id}] Title: ${a.title} (Macro: ${a.macro_shortcut})\nSummary: ${a.summary}\nDetails: ${a.content}`
    )
    .join('\n\n');

  const transcript = input.messages
    .map((m) => `[${m.sender_type.toUpperCase()} — ${m.sender_name}]: ${m.body}`)
    .join('\n\n');

  const systemInstruction = `You are AI Assist Copilot, an enterprise customer operations engineering assistant.
Analyze the support ticket thread and internal notes, ground your solution strictly in the provided Knowledge Base articles when applicable, and return a structured JSON response.
Tone requirement: ${input.tone || 'Professional & Technical'}.
Never invent fake URLs or non-existent article IDs. Only cite article IDs present in the Knowledge Base list.
Keep the draftReply clear, empathetic, technically accurate, and ready for an operations engineer to send directly to ${input.customerName} at ${input.customerCompany}.${
    input.agentSignature ? `\nSign off with:\n${input.agentSignature}` : ''
  }`;

  const prompt = `Ticket: ${input.ticketCode} — ${input.subject}
Account: ${input.customerCompany} (${input.customerTier}) | Contact: ${input.customerName}
Current Category: ${input.category} | Priority: ${input.priority}
${input.customInstruction ? `\nAgent Specific Instruction: ${input.customInstruction}\n` : ''}
--- KNOWLEDGE BASE ARTICLES ---
${kbContext || 'No published articles available.'}

--- CONVERSATION THREAD ---
${transcript}`;

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'Concise 1-2 sentence executive synthesis of the current root cause and status.',
          },
          intent: {
            type: Type.STRING,
            description: 'Short 2-4 word classification of customer intent (e.g., Webhook Auth Recovery).',
          },
          sentiment: {
            type: Type.STRING,
            description: 'One of: positive, neutral, frustrated, critical.',
          },
          confidence: {
            type: Type.INTEGER,
            description: 'Confidence score from 65 to 99 based on how clearly KB and thread explain the issue.',
          },
          resolutionSteps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 to 4 concrete, actionable steps for the support engineer.',
          },
          draftReply: {
            type: Type.STRING,
            description: 'Polished, ready-to-send customer response grounded in KB details.',
          },
          citedArticleIds: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: 'Array of numeric KB Article IDs actually used in the draft.',
          },
        },
        required: [
          'summary',
          'intent',
          'sentiment',
          'confidence',
          'resolutionSteps',
          'draftReply',
          'citedArticleIds',
        ],
      },
    },
  });

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText);

  const validSentiments = ['positive', 'neutral', 'frustrated', 'critical'];
  const sentiment = validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral';
  const confidence = Math.max(50, Math.min(99, Number(parsed.confidence) || 90));
  const citedIds = Array.isArray(parsed.citedArticleIds) ? parsed.citedArticleIds : [];
  const citedArticles = input.kbArticles
    .filter((a) => citedIds.includes(a.id))
    .map((a) => ({ id: a.id, title: a.title, macro_shortcut: a.macro_shortcut }));

  return {
    draftReply: String(parsed.draftReply || ''),
    summary: String(parsed.summary || ''),
    sentiment,
    intent: String(parsed.intent || input.category),
    confidence,
    resolutionSteps: Array.isArray(parsed.resolutionSteps)
      ? parsed.resolutionSteps.map(String).slice(0, 5)
      : [],
    citedArticles,
    model: AI_MODEL,
    generatedAt: new Date().toISOString(),
  };
}

export interface ClassifyInput {
  inquiryText: string;
  kbArticles: Array<{ id: number; title: string; summary: string; content: string; macro_shortcut: string }>;
  rules: Array<{
    id: number;
    name: string;
    trigger_keyword: string;
    target_category: string;
    target_priority: string;
    enabled: number;
  }>;
}

export async function classifyInquiryWithGemini(input: ClassifyInput) {
  const ai = getGeminiClient();

  const kbContext = input.kbArticles
    .map((a) => `[ID:${a.id}] ${a.title} (${a.macro_shortcut}): ${a.summary}`)
    .join('\n');

  const activeRules = input.rules.filter((r) => r.enabled === 1);
  const rulesContext = activeRules
    .map(
      (r) =>
        `[Rule ID:${r.id}] "${r.name}" | keywords: ${r.trigger_keyword} -> category: ${r.target_category}, priority: ${r.target_priority}`
    )
    .join('\n');

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: `Incoming Customer Inquiry:\n${input.inquiryText}\n\n--- ACTIVE ROUTING RULES ---\n${rulesContext}\n\n--- PUBLISHED KB ARTICLES ---\n${kbContext}`,
    config: {
      systemInstruction:
        'You are the AI Assist automated triage engine. Classify the incoming customer inquiry accurately, match relevant routing rules and KB articles, and draft a concise first response.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          priority: {
            type: Type.STRING,
            description: 'One of: low, medium, high, urgent',
          },
          sentiment: {
            type: Type.STRING,
            description: 'One of: positive, neutral, frustrated, critical',
          },
          confidence: { type: Type.INTEGER },
          suggestedSummary: { type: Type.STRING },
          draftReply: { type: Type.STRING },
          matchedRuleIds: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
          citedArticleIds: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
          },
        },
        required: [
          'category',
          'priority',
          'sentiment',
          'confidence',
          'suggestedSummary',
          'draftReply',
          'matchedRuleIds',
          'citedArticleIds',
        ],
      },
    },
  });

  const parsed = JSON.parse((response.text ?? '{}').trim());
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  const validSentiments = ['positive', 'neutral', 'frustrated', 'critical'];

  const matchedRuleIds = Array.isArray(parsed.matchedRuleIds) ? parsed.matchedRuleIds : [];
  const citedArticleIds = Array.isArray(parsed.citedArticleIds) ? parsed.citedArticleIds : [];

  return {
    category: String(parsed.category || 'Technical'),
    priority: (validPriorities.includes(parsed.priority) ? parsed.priority : 'medium') as
      | 'low'
      | 'medium'
      | 'high'
      | 'urgent',
    sentiment: (validSentiments.includes(parsed.sentiment) ? parsed.sentiment : 'neutral') as
      | 'positive'
      | 'neutral'
      | 'frustrated'
      | 'critical',
    confidence: Math.max(50, Math.min(99, Number(parsed.confidence) || 88)),
    suggestedSummary: String(parsed.suggestedSummary || ''),
    draftReply: String(parsed.draftReply || ''),
    matchedRules: activeRules
      .filter((r) => matchedRuleIds.includes(r.id))
      .map((r) => ({
        id: r.id,
        name: r.name,
        target_category: r.target_category,
        target_priority: r.target_priority,
      })),
    citedArticles: input.kbArticles
      .filter((a) => citedArticleIds.includes(a.id))
      .map((a) => ({ id: a.id, title: a.title, macro_shortcut: a.macro_shortcut })),
    model: AI_MODEL,
  };
}
