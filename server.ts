import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { db, DB_PATH, seedIfEmpty } from './server/db.ts';
import { classifyInquiryWithGemini, generateCopilotSuggestion } from './server/gemini.ts';

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT) || 3000;

function getTicketSelectBase() {
  return `
    SELECT
      t.*,
      c.name AS customer_name,
      c.company AS customer_company,
      c.email AS customer_email,
      c.tier AS customer_tier,
      c.sla_tier AS customer_sla_tier,
      c.arr AS customer_arr,
      c.avatar_initials AS customer_initials,
      (SELECT COUNT(*) FROM messages m WHERE m.ticket_id = t.id) AS message_count,
      (SELECT m.body FROM messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message_preview
    FROM tickets t
    JOIN customers c ON c.id = t.customer_id
  `;
}

// Health & Backend Connectivity Diagnostics
app.get('/api/health', (_req, res) => {
  const started = performance.now();
  try {
    const customers = (db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number }).c;
    const tickets = (db.prepare('SELECT COUNT(*) as c FROM tickets').get() as { c: number }).c;
    const messages = (db.prepare('SELECT COUNT(*) as c FROM messages').get() as { c: number }).c;
    const kb_articles = (db.prepare('SELECT COUNT(*) as c FROM kb_articles').get() as { c: number }).c;
    const automation_rules = (db.prepare('SELECT COUNT(*) as c FROM automation_rules').get() as { c: number }).c;
    const latencyMs = Math.max(1, Math.round((performance.now() - started) * 10) / 10);

    res.json({
      status: 'connected',
      engine: 'SQLite (WAL Mode) + Express REST API',
      dbPath: path.relative(process.cwd(), DB_PATH),
      latencyMs,
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
      tables: { customers, tickets, messages, kb_articles, automation_rules },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err instanceof Error ? err.message : 'Database connectivity check failed',
    });
  }
});

// Executive Overview Dashboard
app.get('/api/overview', (_req, res) => {
  try {
    const allTickets = db.prepare(getTicketSelectBase()).all() as Array<Record<string, unknown>>;
    const totalCount = allTickets.length;
    const resolvedCount = allTickets.filter((t) => t.status === 'resolved').length;
    const urgentCount = allTickets.filter((t) => t.status === 'urgent' || (t.priority === 'urgent' && t.status !== 'resolved')).length;
    const openCount = totalCount - resolvedCount;

    const nowMs = Date.now();
    const withinSlaCount = allTickets.filter((t) => {
      if (t.status === 'resolved') return true;
      return new Date(String(t.sla_due_at)).getTime() > nowMs;
    }).length;
    const slaCompliance = totalCount > 0 ? Math.round((withinSlaCount / totalCount) * 1000) / 10 : 100;

    const avgConfidence =
      totalCount > 0
        ? Math.round(
            allTickets.reduce((acc, t) => acc + Number(t.ai_confidence || 0), 0) / totalCount
          )
        : 0;

    const aiAssistedCount = allTickets.filter((t) => Number(t.ai_confidence || 0) >= 85).length;
    const aiAssistRate = totalCount > 0 ? Math.round((aiAssistedCount / totalCount) * 100) : 0;

    const byCategory = db
      .prepare('SELECT category AS name, COUNT(*) AS count FROM tickets GROUP BY category ORDER BY count DESC')
      .all();

    const byPriority = db
      .prepare(
        `SELECT priority AS name, COUNT(*) AS count FROM tickets
         GROUP BY priority
         ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`
      )
      .all();

    const urgentWatchlist = db
      .prepare(
        `${getTicketSelectBase()} WHERE t.status != 'resolved' ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.sla_due_at ASC LIMIT 5`
      )
      .all();

    const recentActivity = db
      .prepare(
        `SELECT m.id, m.ticket_id, t.ticket_code, t.subject, m.sender_type, m.sender_name, m.body, m.created_at
         FROM messages m
         JOIN tickets t ON t.id = m.ticket_id
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 6`
      )
      .all();

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const baseIncoming = [34, 42, 39, 51, 47, 26, Math.max(18, openCount * 3)];
    const volumeTrend = days.map((day, idx) => {
      const incoming = baseIncoming[idx];
      const aiAssisted = Math.round(incoming * (Math.max(68, aiAssistRate) / 100));
      const resolved = Math.max(10, incoming - (idx === 6 ? openCount : Math.round(incoming * 0.14)));
      return { day, incoming, aiAssisted, resolved };
    });

    res.json({
      kpis: {
        openCount,
        urgentCount,
        resolvedCount,
        totalCount,
        slaCompliance,
        aiAssistRate,
        avgConfidence,
        medianFirstResponseMins: 11,
      },
      volumeTrend,
      byCategory,
      byPriority,
      urgentWatchlist,
      recentActivity,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load overview' });
  }
});

// Tickets CRUD
app.get('/api/tickets', (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const priority = typeof req.query.priority === 'string' ? req.query.priority : '';
    const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const clauses: string[] = [];
    const params: unknown[] = [];

    if (status && status !== 'all') {
      clauses.push('t.status = ?');
      params.push(status);
    }
    if (priority && priority !== 'all') {
      clauses.push('t.priority = ?');
      params.push(priority);
    }
    if (search) {
      clauses.push(
        '(t.ticket_code LIKE ? OR t.subject LIKE ? OR c.company LIKE ? OR c.name LIKE ? OR t.category LIKE ?)'
      );
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = db
      .prepare(
        `${getTicketSelectBase()} ${where}
         ORDER BY
           CASE t.status WHEN 'urgent' THEN 1 WHEN 'open' THEN 2 WHEN 'in_progress' THEN 3 ELSE 4 END,
           t.updated_at DESC`
      )
      .all(...params);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch tickets' });
  }
});

app.get('/api/tickets/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const ticket = db.prepare(`${getTicketSelectBase()} WHERE t.id = ?`).get(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const messages = db
      .prepare('SELECT * FROM messages WHERE ticket_id = ? ORDER BY created_at ASC, id ASC')
      .all(id);
    res.json({ ...(ticket as Record<string, unknown>), messages });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch ticket' });
  }
});

app.post('/api/tickets', (req, res) => {
  try {
    const {
      subject,
      customer_id,
      priority = 'medium',
      category = 'Technical',
      channel = 'Enterprise Portal',
      assignee = 'Elena Rostova',
      initialMessage,
    } = req.body;

    if (!subject || !customer_id) {
      return res.status(400).json({ error: 'subject and customer_id are required' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(customer_id)) as
      | { id: number; name: string }
      | undefined;
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const maxIdRow = db.prepare('SELECT COALESCE(MAX(id), 0) AS maxId FROM tickets').get() as { maxId: number };
    const ticketCode = `AIA-${4822 + maxIdRow.maxId}`;
    const slaHours = priority === 'urgent' ? 1 : priority === 'high' ? 4 : 8;
    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
    const status = priority === 'urgent' ? 'urgent' : 'open';
    const sentiment = priority === 'urgent' ? 'critical' : priority === 'high' ? 'frustrated' : 'neutral';
    const nowIso = new Date().toISOString();

    const insertTx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO tickets (
            ticket_code, subject, customer_id, status, priority, category, channel,
            assignee, sentiment, ai_confidence, ai_summary, sla_due_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          ticketCode,
          String(subject).trim(),
          customer.id,
          status,
          priority,
          category,
          channel,
          assignee,
          sentiment,
          87,
          'Awaiting AI Copilot synthesis.',
          slaDueAt,
          nowIso,
          nowIso
        );

      const newId = Number(info.lastInsertRowid);
      if (initialMessage && String(initialMessage).trim()) {
        db.prepare(
          `INSERT INTO messages (ticket_id, sender_type, sender_name, body, created_at)
           VALUES (?, 'customer', ?, ?, ?)`
        ).run(newId, customer.name, String(initialMessage).trim(), nowIso);
      }
      return newId;
    });

    const newId = insertTx();
    const created = db.prepare(`${getTicketSelectBase()} WHERE t.id = ?`).get(newId);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create ticket' });
  }
});

app.patch('/api/tickets/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id FROM tickets WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const allowed = ['status', 'priority', 'category', 'assignee', 'sentiment', 'ai_summary', 'ai_confidence'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid update fields supplied' });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare(`${getTicketSelectBase()} WHERE t.id = ?`).get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update ticket' });
  }
});

app.post('/api/tickets/bulk', (req, res) => {
  try {
    const { ids, status, assignee, priority } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }
    if (assignee) {
      updates.push('assignee = ?');
      values.push(assignee);
    }
    if (priority) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Specify status, assignee, or priority to update' });
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    const placeholders = ids.map(() => '?').join(',');
    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id IN (${placeholders})`).run(
      ...values,
      ...ids.map(Number)
    );

    res.json({ updated: ids.length });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Bulk update failed' });
  }
});

app.delete('/api/tickets/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete ticket' });
  }
});

// Ticket Messages
app.post('/api/tickets/:id/messages', (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { sender_type = 'agent', sender_name = 'Elena Rostova', body, resolveAfterSend = false } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const ticket = db.prepare('SELECT id, status FROM tickets WHERE id = ?').get(ticketId) as
      | { id: number; status: string }
      | undefined;
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO messages (ticket_id, sender_type, sender_name, body, created_at)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(ticketId, sender_type, sender_name, String(body).trim(), nowIso);

      const nextStatus = resolveAfterSend
        ? 'resolved'
        : sender_type === 'agent' && ticket.status === 'open'
          ? 'in_progress'
          : ticket.status;

      db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run(
        nextStatus,
        nowIso,
        ticketId
      );

      return Number(info.lastInsertRowid);
    });

    const msgId = tx();
    const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(msgId);
    const updatedTicket = db.prepare(`${getTicketSelectBase()} WHERE t.id = ?`).get(ticketId);
    res.status(201).json({ message, ticket: updatedTicket });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to send message' });
  }
});

// Customers CRUD
app.get('/api/customers', (_req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT
          c.*,
          (SELECT COUNT(*) FROM tickets t WHERE t.customer_id = c.id AND t.status != 'resolved') AS open_tickets,
          (SELECT COUNT(*) FROM tickets t WHERE t.customer_id = c.id) AS total_tickets
         FROM customers c
         ORDER BY c.arr DESC`
      )
      .all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch customers' });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const {
      name,
      company,
      email,
      tier = 'Enterprise',
      arr = 120000,
      sla_tier = 'Gold 4h',
      health_score = 90,
    } = req.body;

    if (!name || !company || !email) {
      return res.status(400).json({ error: 'name, company, and email are required' });
    }

    const parts = String(name).trim().split(/\s+/);
    const initials = (parts[0]?.[0] || 'C') + (parts[1]?.[0] || parts[0]?.[1] || 'U');

    const info = db
      .prepare(
        `INSERT INTO customers (name, company, email, tier, arr, sla_tier, health_score, avatar_initials, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(name).trim(),
        String(company).trim(),
        String(email).trim().toLowerCase(),
        tier,
        Number(arr) || 0,
        sla_tier,
        Math.max(1, Math.min(100, Number(health_score) || 85)),
        initials.toUpperCase(),
        new Date().toISOString()
      );

    const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create customer' });
  }
});

app.patch('/api/customers/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const allowed = ['name', 'company', 'email', 'tier', 'arr', 'sla_tier', 'health_score'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(id);
    db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update customer' });
  }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete customer' });
  }
});

// Knowledge Base & Macros CRUD
app.get('/api/kb', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM kb_articles ORDER BY usage_count DESC, updated_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch KB articles' });
  }
});

app.post('/api/kb', (req, res) => {
  try {
    const {
      title,
      category = 'Technical',
      summary,
      content,
      macro_shortcut = '/custom',
      status = 'published',
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' });
    }

    const shortcut = String(macro_shortcut).startsWith('/') ? String(macro_shortcut) : `/${macro_shortcut}`;
    const info = db
      .prepare(
        `INSERT INTO kb_articles (title, category, summary, content, macro_shortcut, status, usage_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        String(title).trim(),
        category,
        String(summary || String(content).slice(0, 120)).trim(),
        String(content).trim(),
        shortcut,
        status,
        new Date().toISOString()
      );

    const created = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create article' });
  }
});

app.patch('/api/kb/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.body.incrementUsage) {
      db.prepare('UPDATE kb_articles SET usage_count = usage_count + 1 WHERE id = ?').run(id);
      const row = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(id);
      return res.json(row);
    }

    const allowed = ['title', 'category', 'summary', 'content', 'macro_shortcut', 'status'];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    db.prepare(`UPDATE kb_articles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update article' });
  }
});

app.delete('/api/kb/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM kb_articles WHERE id = ?').run(id);
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete article' });
  }
});

// Automation Rules CRUD
app.get('/api/automations', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM automation_rules ORDER BY enabled DESC, executions_count DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch rules' });
  }
});

app.post('/api/automations', (req, res) => {
  try {
    const {
      name,
      trigger_keyword,
      target_category = 'Technical',
      target_priority = 'high',
      auto_draft = 1,
      confidence_threshold = 85,
      enabled = 1,
    } = req.body;

    if (!name || !trigger_keyword) {
      return res.status(400).json({ error: 'name and trigger_keyword are required' });
    }

    const info = db
      .prepare(
        `INSERT INTO automation_rules (
          name, trigger_keyword, target_category, target_priority, auto_draft,
          confidence_threshold, enabled, executions_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
      )
      .run(
        String(name).trim(),
        String(trigger_keyword).trim(),
        target_category,
        target_priority,
        auto_draft ? 1 : 0,
        Number(confidence_threshold) || 85,
        enabled ? 1 : 0,
        new Date().toISOString()
      );

    const created = db
      .prepare('SELECT * FROM automation_rules WHERE id = ?')
      .get(Number(info.lastInsertRowid));
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create rule' });
  }
});

app.patch('/api/automations/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const allowed = [
      'name',
      'trigger_keyword',
      'target_category',
      'target_priority',
      'auto_draft',
      'confidence_threshold',
      'enabled',
    ];
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(req.body[f]);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(id);
    db.prepare(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update rule' });
  }
});

app.delete('/api/automations/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);
    res.json({ deleted: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to delete rule' });
  }
});

// Analytics & SLA Reports
app.get('/api/analytics', (_req, res) => {
  try {
    const tickets = db.prepare('SELECT * FROM tickets').all() as Array<Record<string, unknown>>;
    const nowMs = Date.now();
    const priorities = ['urgent', 'high', 'medium', 'low'];

    const slaByPriority = priorities.map((priority) => {
      const subset = tickets.filter((t) => t.priority === priority);
      const withinSla = subset.filter(
        (t) => t.status === 'resolved' || new Date(String(t.sla_due_at)).getTime() > nowMs
      ).length;
      const rate = subset.length > 0 ? Math.round((withinSla / subset.length) * 100) : 100;
      return { priority, total: subset.length, withinSla, rate };
    });

    const sentimentBreakdown = db
      .prepare('SELECT sentiment, COUNT(*) AS count FROM tickets GROUP BY sentiment ORDER BY count DESC')
      .all();

    const agentPerformance = db
      .prepare(
        `SELECT
          assignee AS agent,
          COUNT(*) AS assigned,
          SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
          ROUND(AVG(ai_confidence)) AS avgConfidence
         FROM tickets
         GROUP BY assignee
         ORDER BY assigned DESC`
      )
      .all();

    const channelMix = db
      .prepare('SELECT channel, COUNT(*) AS count FROM tickets GROUP BY channel ORDER BY count DESC')
      .all();

    const topMacros = db
      .prepare('SELECT id, title, macro_shortcut, usage_count FROM kb_articles ORDER BY usage_count DESC LIMIT 5')
      .all();

    res.json({
      slaByPriority,
      sentimentBreakdown,
      agentPerformance,
      channelMix,
      topMacros,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to compute analytics' });
  }
});

// Workspace Settings
app.get('/api/settings', (_req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM workspace_settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load settings' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const upsert = db.prepare(
      `INSERT INTO workspace_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    );

    const tx = db.transaction((entries: Array<[string, unknown]>) => {
      for (const [k, v] of entries) {
        upsert.run(k, String(v));
      }
    });

    tx(Object.entries(req.body || {}));
    const rows = db.prepare('SELECT key, value FROM workspace_settings').all() as Array<{
      key: string;
      value: string;
    }>;
    const updated: Record<string, string> = {};
    for (const r of rows) {
      updated[r.key] = r.value;
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to save settings' });
  }
});

// Admin Data Operations (Reseed / Export)
app.post('/api/admin/reseed', (_req, res) => {
  try {
    seedIfEmpty(true);
    res.json({ reseeded: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Reseed failed' });
  }
});

app.get('/api/admin/export', (_req, res) => {
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      customers: db.prepare('SELECT * FROM customers').all(),
      tickets: db.prepare('SELECT * FROM tickets').all(),
      messages: db.prepare('SELECT * FROM messages').all(),
      kb_articles: db.prepare('SELECT * FROM kb_articles').all(),
      automation_rules: db.prepare('SELECT * FROM automation_rules').all(),
      workspace_settings: db.prepare('SELECT * FROM workspace_settings').all(),
    };
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

// Server-Side Gemini AI Copilot Endpoints
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { ticketId, tone, customInstruction } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: 'ticketId is required' });
    }

    const ticket = db.prepare(`${getTicketSelectBase()} WHERE t.id = ?`).get(Number(ticketId)) as
      | Record<string, unknown>
      | undefined;

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const messages = db
      .prepare('SELECT sender_type, sender_name, body, created_at FROM messages WHERE ticket_id = ? ORDER BY created_at ASC')
      .all(Number(ticketId)) as Array<{
      sender_type: string;
      sender_name: string;
      body: string;
      created_at: string;
    }>;

    const kbArticles = db
      .prepare("SELECT id, title, summary, content, macro_shortcut FROM kb_articles WHERE status = 'published'")
      .all() as Array<{
      id: number;
      title: string;
      summary: string;
      content: string;
      macro_shortcut: string;
    }>;

    const sigRow = db
      .prepare("SELECT value FROM workspace_settings WHERE key = 'agentSignature'")
      .get() as { value: string } | undefined;

    const defaultToneRow = db
      .prepare("SELECT value FROM workspace_settings WHERE key = 'aiDefaultTone'")
      .get() as { value: string } | undefined;

    const result = await generateCopilotSuggestion({
      ticketCode: String(ticket.ticket_code),
      subject: String(ticket.subject),
      category: String(ticket.category),
      priority: String(ticket.priority),
      customerName: String(ticket.customer_name),
      customerCompany: String(ticket.customer_company),
      customerTier: String(ticket.customer_tier),
      messages,
      kbArticles,
      tone: tone || defaultToneRow?.value || 'Professional & Technical',
      customInstruction,
      agentSignature: sigRow?.value,
    });

    db.prepare(
      'UPDATE tickets SET ai_summary = ?, ai_confidence = ?, sentiment = ?, updated_at = ? WHERE id = ?'
    ).run(result.summary, result.confidence, result.sentiment, new Date().toISOString(), Number(ticketId));

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI Copilot generation failed';
    res.status(500).json({ error: message });
  }
});

app.post('/api/ai/classify', async (req, res) => {
  try {
    const { inquiryText } = req.body;
    if (!inquiryText || !String(inquiryText).trim()) {
      return res.status(400).json({ error: 'inquiryText is required' });
    }

    const kbArticles = db
      .prepare("SELECT id, title, summary, content, macro_shortcut FROM kb_articles WHERE status = 'published'")
      .all() as Array<{
      id: number;
      title: string;
      summary: string;
      content: string;
      macro_shortcut: string;
    }>;

    const rules = db.prepare('SELECT * FROM automation_rules').all() as Array<{
      id: number;
      name: string;
      trigger_keyword: string;
      target_category: string;
      target_priority: string;
      enabled: number;
    }>;

    const result = await classifyInquiryWithGemini({
      inquiryText: String(inquiryText).trim(),
      kbArticles,
      rules,
    });

    if (result.matchedRules.length > 0) {
      const inc = db.prepare(
        'UPDATE automation_rules SET executions_count = executions_count + 1 WHERE id = ?'
      );
      for (const mr of result.matchedRules) {
        inc.run(mr.id);
      }
    }

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI classification failed';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Assist server running at http://localhost:${PORT}`);
  });
}

startServer();
