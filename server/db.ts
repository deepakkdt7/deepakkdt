import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const DB_PATH = path.join(dataDir, 'ai-assist.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      tier TEXT NOT NULL DEFAULT 'Enterprise',
      arr INTEGER NOT NULL DEFAULT 120000,
      sla_tier TEXT NOT NULL DEFAULT 'Platinum 1h',
      health_score INTEGER NOT NULL DEFAULT 88,
      avatar_initials TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT NOT NULL UNIQUE,
      subject TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'Technical',
      channel TEXT NOT NULL DEFAULT 'Email',
      assignee TEXT NOT NULL DEFAULT 'Elena Rostova',
      sentiment TEXT NOT NULL DEFAULT 'neutral',
      ai_confidence INTEGER NOT NULL DEFAULT 89,
      ai_summary TEXT NOT NULL DEFAULT '',
      sla_due_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_type TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kb_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      macro_shortcut TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      usage_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trigger_keyword TEXT NOT NULL,
      target_category TEXT NOT NULL,
      target_priority TEXT NOT NULL,
      auto_draft INTEGER NOT NULL DEFAULT 1,
      confidence_threshold INTEGER NOT NULL DEFAULT 85,
      enabled INTEGER NOT NULL DEFAULT 1,
      executions_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workspace_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function isoOffset(minutesFromNow: number): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

export function seedIfEmpty(force = false): void {
  const countRow = db.prepare('SELECT COUNT(*) as c FROM customers').get() as { c: number };
  if (!force && countRow.c > 0) {
    return;
  }

  const seedTx = db.transaction(() => {
    if (force) {
      db.exec(`
        DELETE FROM messages;
        DELETE FROM tickets;
        DELETE FROM customers;
        DELETE FROM kb_articles;
        DELETE FROM automation_rules;
        DELETE FROM workspace_settings;
      `);
    }

    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, company, email, tier, arr, sla_tier, health_score, avatar_initials, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const customersData = [
      ['Marcus Vance', 'Northstar Financial', 'm.vance@northstarfin.io', 'Enterprise', 480000, 'Platinum 1h', 72, 'MV', isoOffset(-42000)],
      ['Sora Takahashi', 'Kuroda Cloud Systems', 'stakahashi@kurodacloud.jp', 'Enterprise', 340000, 'Platinum 1h', 91, 'ST', isoOffset(-38000)],
      ['Claire Beaumont', 'Helios Biotech', 'c.beaumont@heliosbio.com', 'Enterprise', 295000, 'Gold 4h', 84, 'CB', isoOffset(-31000)],
      ['Devon Brooks', 'Meridian Logistics', 'dbrooks@meridianlog.com', 'Mid-Market', 145000, 'Gold 4h', 65, 'DB', isoOffset(-24000)],
      ['Ananya Patel', 'Veritas Payments', 'apatel@veritaspay.co', 'Enterprise', 520000, 'Platinum 1h', 95, 'AP', isoOffset(-19000)],
      ['Henrik Lindqvist', 'Nordic Grid Energy', 'hlindqvist@nordicgrid.se', 'Mid-Market', 175000, 'Standard 8h', 88, 'HL', isoOffset(-15000)],
      ['Rachel Kim', 'Stratos Robotics', 'rkim@stratosrobotics.ai', 'Growth', 84000, 'Standard 8h', 93, 'RK', isoOffset(-11000)],
      ['Lucas Morales', 'Solstice Retail Group', 'lmorales@solsticeretail.com', 'Mid-Market', 132000, 'Gold 4h', 79, 'LM', isoOffset(-8500)],
    ];

    const customerIds: number[] = [];
    for (const c of customersData) {
      const res = insertCustomer.run(...c);
      customerIds.push(Number(res.lastInsertRowid));
    }

    const insertTicket = db.prepare(`
      INSERT INTO tickets (
        ticket_code, subject, customer_id, status, priority, category, channel,
        assignee, sentiment, ai_confidence, ai_summary, sla_due_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const ticketsData = [
      [
        'AIA-4821',
        'Production webhook delivery returning 403 after TLS certificate rotation',
        customerIds[0],
        'urgent',
        'urgent',
        'API & Webhooks',
        'Slack Connect',
        'Elena Rostova',
        'critical',
        96,
        'Customer rotated edge TLS cert 45 mins ago; HMAC signature header verification is failing on /v2/webhooks/settlements.',
        isoOffset(28),
        isoOffset(-46),
        isoOffset(-4),
      ],
      [
        'AIA-4820',
        'SAML SSO IdP metadata refresh failing for EMEA engineering group',
        customerIds[4],
        'urgent',
        'urgent',
        'Authentication',
        'Enterprise Portal',
        'Elena Rostova',
        'frustrated',
        94,
        'Okta IdP certificate rollover triggered mismatched ACS binding for 140 EMEA users; requires immediate dual-cert window activation.',
        isoOffset(42),
        isoOffset(-78),
        isoOffset(-9),
      ],
      [
        'AIA-4819',
        'Invoice #INV-99210 shows duplicate enterprise seat overage line item',
        customerIds[3],
        'in_progress',
        'high',
        'Billing & Usage',
        'Email',
        'Daniel Cho',
        'frustrated',
        91,
        'Mid-cycle license true-up counted 18 deactivated contractor seats prior to billing cutoff; credit memo draft ready for finance approval.',
        isoOffset(135),
        isoOffset(-160),
        isoOffset(-22),
      ],
      [
        'AIA-4818',
        'Streaming audit log export lagging 15 minutes behind real-time events',
        customerIds[1],
        'in_progress',
        'high',
        'Data Pipeline',
        'API Alert',
        'Priya Nair',
        'neutral',
        92,
        'Snowflake ingestion sink in ap-northeast-1 experiencing batch flush delay due to partition key skew on audit_events_v3.',
        isoOffset(190),
        isoOffset(-210),
        isoOffset(-31),
      ],
      [
        'AIA-4817',
        'Requesting SOC 2 Type II bridge letter & HIPAA BAA addendum',
        customerIds[2],
        'open',
        'medium',
        'Security & Compliance',
        'Enterprise Portal',
        'Elena Rostova',
        'neutral',
        97,
        'Annual vendor security review requires Q4 SOC 2 bridge letter and countersigned BAA for clinical trial telemetry workspace.',
        isoOffset(290),
        isoOffset(-260),
        isoOffset(-60),
      ],
      [
        'AIA-4816',
        'Role-based access permissions not propagating to sub-organization workspaces',
        customerIds[7],
        'open',
        'high',
        'Permissions & RBAC',
        'Email',
        'Daniel Cho',
        'frustrated',
        88,
        'Custom Analyst role updated at parent org level does not inherit read-only billing restrictions into child retail regions.',
        isoOffset(165),
        isoOffset(-310),
        isoOffset(-85),
      ],
      [
        'AIA-4815',
        'Rate limit increase request for seasonal warehouse telemetry sync',
        customerIds[6],
        'open',
        'medium',
        'API & Webhooks',
        'Slack Connect',
        'Priya Nair',
        'positive',
        93,
        'Customer requesting temporary burst quota increase from 600 req/min to 2,500 req/min for Q4 robotics fleet firmware rollout.',
        isoOffset(410),
        isoOffset(-420),
        isoOffset(-120),
      ],
      [
        'AIA-4814',
        'Custom domain CNAME verification stuck in pending state',
        customerIds[5],
        'resolved',
        'low',
        'Infrastructure',
        'Email',
        'Priya Nair',
        'positive',
        95,
        'DNS CAA record blocked Let’s Encrypt issuance; customer added letsencrypt.org entry and SSL certificate provisioned cleanly.',
        isoOffset(600),
        isoOffset(-1440),
        isoOffset(-240),
      ],
      [
        'AIA-4813',
        'Automated Slack escalation alerts missing P1 incident runbook link',
        customerIds[1],
        'resolved',
        'medium',
        'Integrations',
        'Slack Connect',
        'Elena Rostova',
        'positive',
        94,
        'Template variable {{incident.runbook_url}} was unescaped in webhook payload formatter; patched and verified in staging.',
        isoOffset(720),
        isoOffset(-2100),
        isoOffset(-480),
      ],
      [
        'AIA-4812',
        'Sandbox environment data masking configuration for QA team',
        customerIds[4],
        'resolved',
        'low',
        'Security & Compliance',
        'Enterprise Portal',
        'Daniel Cho',
        'positive',
        96,
        'Enabled deterministic PII tokenization across sandbox clones so QA engineers can reproduce edge cases without raw cardholder data.',
        isoOffset(900),
        isoOffset(-2880),
        isoOffset(-720),
      ],
    ];

    const ticketIds: number[] = [];
    for (const t of ticketsData) {
      const res = insertTicket.run(...t);
      ticketIds.push(Number(res.lastInsertRowid));
    }

    const insertMessage = db.prepare(`
      INSERT INTO messages (ticket_id, sender_type, sender_name, body, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const messagesData = [
      // Ticket 1 (AIA-4821)
      [
        ticketIds[0],
        'customer',
        'Marcus Vance',
        'Hi team — we rotated our edge TLS certificate on our settlement webhook gateway 45 minutes ago, and since then every callback from your platform is hitting HTTP 403 Invalid Signature. Payment reconciliation is paused until this clears. Can you check if our webhook signing secret was invalidated during cert reload?',
        isoOffset(-46),
      ],
      [
        ticketIds[0],
        'internal',
        'Elena Rostova',
        'Checked gateway telemetry: Northstar’s endpoint is still validating against our previous webhook signing key `whsec_live_98a4` while their load balancer strips the `X-AI-Timestamp` header on the new ingress rule. Pulling KB-101 dual-key rotation steps.',
        isoOffset(-18),
      ],
      [
        ticketIds[0],
        'customer',
        'Marcus Vance',
        'Quick update — our SRE confirmed our ingress proxy was updated alongside the TLS cert. Could you verify whether `X-AI-Timestamp` is mandatory for replay protection and give us the exact header allowlist?',
        isoOffset(-4),
      ],

      // Ticket 2 (AIA-4820)
      [
        ticketIds[1],
        'customer',
        'Ananya Patel',
        'Our Okta IdP signing certificate rolled over at 09:00 UTC and now 140 engineers in London and Frankfurt cannot authenticate via SAML SSO. Error displayed: SAML_ACS_SIGNATURE_MISMATCH. We need emergency dual-certificate validation enabled immediately.',
        isoOffset(-78),
      ],
      [
        ticketIds[1],
        'internal',
        'Elena Rostova',
        'Verified tenant `veritas-prod-eu`. Current active cert fingerprint ends in `4E:91`. Ready to enable 24h dual-certificate grace mode once customer shares new X.509 thumbprint.',
        isoOffset(-32),
      ],
      [
        ticketIds[1],
        'customer',
        'Ananya Patel',
        'We uploaded the new Okta metadata XML in the security portal just now. Please confirm when dual-cert grace mode is live so we can notify EMEA engineering.',
        isoOffset(-9),
      ],

      // Ticket 3 (AIA-4819)
      [
        ticketIds[2],
        'customer',
        'Devon Brooks',
        'Looking at Invoice #INV-99210 for October, we were billed for 18 extra Enterprise seats ($2,160). We deactivated those seasonal contractors on September 28 before the billing cycle closed. Could you review and issue a corrected invoice?',
        isoOffset(-160),
      ],
      [
        ticketIds[2],
        'agent',
        'Daniel Cho',
        'Hi Devon, thanks for flagging this. I am reviewing the seat audit log between September 25 and October 1 right now to confirm the exact deactivation timestamps.',
        isoOffset(-95),
      ],
      [
        ticketIds[2],
        'internal',
        'Daniel Cho',
        'Confirmed in billing ledger: 18 seats were marked suspended rather than deprovisioned via SCIM until Oct 2. Eligible for one-time courtesy credit memo ($2,160) per Enterprise True-Up Policy.',
        isoOffset(-22),
      ],

      // Ticket 4 (AIA-4818)
      [
        ticketIds[3],
        'customer',
        'Sora Takahashi',
        'Our SOC monitoring dashboard is showing a 15-minute delay on streaming audit logs arriving in our ap-northeast-1 Snowflake sink. Normally latency is under 30 seconds. Are there any regional queue backlogs?',
        isoOffset(-210),
      ],
      [
        ticketIds[3],
        'agent',
        'Priya Nair',
        'Hi Sora, we checked the Tokyo ingestion cluster and spotted micro-batch queuing on your dedicated Snowflake pipe. Investigating partition skew and will share remediation options shortly.',
        isoOffset(-31),
      ],

      // Ticket 5 (AIA-4817)
      [
        ticketIds[4],
        'customer',
        'Claire Beaumont',
        'Hello — our compliance team is completing our annual audit and needs your latest SOC 2 Type II bridge letter covering Q4 along with the countersigned HIPAA BAA addendum for workspace `helios-clinical-prod`.',
        isoOffset(-260),
      ],

      // Ticket 6 (AIA-4816)
      [
        ticketIds[5],
        'customer',
        'Lucas Morales',
        'We updated our custom Analyst role at the Solstice parent organization to restrict billing exports, but regional managers inside our 12 child workspaces can still download billing CSVs. Is RBAC inheritance delayed or does it need manual sync?',
        isoOffset(-310),
      ],

      // Ticket 7 (AIA-4815)
      [
        ticketIds[6],
        'customer',
        'Rachel Kim',
        'We are rolling out firmware v4.2 across 1,400 warehouse robots next Tuesday and expect telemetry burst traffic around 2,200 req/min for 6 hours. Can we schedule a temporary API quota elevation?',
        isoOffset(-420),
      ],

      // Ticket 8 (AIA-4814)
      [
        ticketIds[7],
        'customer',
        'Henrik Lindqvist',
        'Our custom portal domain status.nordicgrid.se has been stuck on "Verifying CNAME" for 4 hours even though dig returns the expected target.',
        isoOffset(-1440),
      ],
      [
        ticketIds[7],
        'agent',
        'Priya Nair',
        'Hi Henrik — we traced this to a DNS CAA record on nordicgrid.se that did not include `letsencrypt.org`. Once added, our edge TLS issuer provisioned the cert automatically. Everything is live now!',
        isoOffset(-240),
      ],

      // Ticket 9 (AIA-4813)
      [
        ticketIds[8],
        'customer',
        'Sora Takahashi',
        'Our P1 Slack alerts stopped rendering the incident runbook button after yesterday’s webhook schema upgrade.',
        isoOffset(-2100),
      ],
      [
        ticketIds[8],
        'agent',
        'Elena Rostova',
        'Fixed the Slack Block Kit template escaping for `{{incident.runbook_url}}` and verified with a test P1 trigger in your staging channel.',
        isoOffset(-480),
      ],

      // Ticket 10 (AIA-4812)
      [
        ticketIds[9],
        'customer',
        'Ananya Patel',
        'Could you enable deterministic PII masking for our newly provisioned QA sandbox so our engineers can test checkout flows safely?',
        isoOffset(-2880),
      ],
      [
        ticketIds[9],
        'agent',
        'Daniel Cho',
        'Deterministic tokenization is now active on `veritas-qa-sandbox`. All email, phone, and PAN fields are masked consistently across refreshes.',
        isoOffset(-720),
      ],
    ];

    for (const m of messagesData) {
      insertMessage.run(...m);
    }

    const insertKB = db.prepare(`
      INSERT INTO kb_articles (title, category, summary, content, macro_shortcut, status, usage_count, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const kbData = [
      [
        'Webhook HMAC Signature & Ingress Header Allowlist',
        'API & Webhooks',
        'Required headers and dual-secret rotation procedure when rotating edge TLS certificates or proxies.',
        'All outbound webhooks require both `X-AI-Signature-256` and `X-AI-Timestamp` headers to pass HMAC-SHA256 replay protection (5-minute tolerance window). When updating load balancers or TLS proxies, ensure custom `X-AI-*` headers are explicitly forwarded. To rotate secrets with zero downtime, enable Dual-Secret Grace Mode under Settings > Webhooks for 24 hours.',
        '/webhook-hmac',
        'published',
        142,
        isoOffset(-3200),
      ],
      [
        'SAML 2.0 Dual-Certificate Rollover Playbook',
        'Authentication',
        'Resolve SAML_ACS_SIGNATURE_MISMATCH during Okta, Entra ID, or Ping certificate rotation.',
        'When an enterprise IdP rotates its X.509 signing certificate, activate Dual-Certificate Grace Mode (24h window) in the Tenant Identity Console so both primary and secondary fingerprints validate simultaneously. Confirm the customer has uploaded the new IdP metadata XML, then clear the SSO assertion cache for affected regions.',
        '/saml-rollover',
        'published',
        98,
        isoOffset(-5400),
      ],
      [
        'Enterprise Seat True-Up & Credit Memo Policy',
        'Billing & Usage',
        'Handling SCIM deprovisioning timing discrepancies and issuing courtesy invoice credits.',
        'Enterprise plans bill based on active provisioned seats at 23:59 UTC on the final day of the billing cycle. If users were suspended in an IdP prior to cutoff but SCIM deprovisioning lagged by under 72 hours, support agents may initiate a one-time credit memo up to $5,000 upon verifying the audit log timestamp.',
        '/billing-credit',
        'published',
        76,
        isoOffset(-4100),
      ],
      [
        'Snowflake Streaming Sink Partition Optimization',
        'Data Pipeline',
        'Diagnosing and resolving ingestion lag above 60 seconds in regional Snowflake pipes.',
        'When streaming audit logs exceed 60s end-to-end latency, inspect `audit_events_v3` partition skew. Recommend enabling adaptive micro-batching (15s flush interval) and switching clustering keys to `(tenant_id, event_hour)`. Rebalancing requires zero downtime and clears backlog within 8 minutes.',
        '/snowflake-lag',
        'published',
        64,
        isoOffset(-6200),
      ],
      [
        'SOC 2 Type II Bridge Letter & HIPAA BAA Fulfillment',
        'Security & Compliance',
        'Standard self-service Trust Center access and countersigned BAA turnaround SLA.',
        'Enterprise accounts can download the current SOC 2 Type II report and Q4 Bridge Letter directly from Trust Portal > Compliance Artifacts. For workspace-specific HIPAA BAA addenda, verify the workspace ID and route to Legal Ops for countersignature within 1 business day.',
        '/soc2-baa',
        'published',
        115,
        isoOffset(-7800),
      ],
      [
        'Parent-to-Child RBAC Policy Propagation Sync',
        'Permissions & RBAC',
        'Force-syncing custom role changes across multi-org sub-workspaces.',
        'By default, custom RBAC role edits apply to newly created child workspaces unless "Cascade to Existing Sub-Organizations" is checked during policy publish. Agents can trigger an immediate permission graph rebuild via `POST /v2/orgs/{id}/rbac/cascade` after confirming with the Org Admin.',
        '/rbac-cascade',
        'published',
        53,
        isoOffset(-1900),
      ],
    ];

    for (const kb of kbData) {
      insertKB.run(...kb);
    }

    const insertRule = db.prepare(`
      INSERT INTO automation_rules (
        name, trigger_keyword, target_category, target_priority, auto_draft,
        confidence_threshold, enabled, executions_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const rulesData = [
      ['Production Webhook 403 Escalation', 'webhook, 403, signature, TLS', 'API & Webhooks', 'urgent', 1, 90, 1, 312, isoOffset(-20000)],
      ['Enterprise SSO Outage Fast-Track', 'SAML, SSO, Okta, ACS, lockout', 'Authentication', 'urgent', 1, 88, 1, 184, isoOffset(-18000)],
      ['Billing Overage & Credit Memo Triage', 'invoice, overage, credit, duplicate, seat', 'Billing & Usage', 'high', 1, 85, 1, 429, isoOffset(-16000)],
      ['Compliance Artifact Auto-Response', 'SOC 2, HIPAA, BAA, bridge letter, ISO', 'Security & Compliance', 'medium', 1, 92, 1, 267, isoOffset(-14000)],
      ['API Quota Burst Pre-Check', 'rate limit, quota, burst, 429, throughput', 'API & Webhooks', 'medium', 0, 80, 1, 151, isoOffset(-12000)],
    ];

    for (const r of rulesData) {
      insertRule.run(...r);
    }

    const insertSetting = db.prepare(`
      INSERT INTO workspace_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    const defaultSettings: Record<string, string> = {
      workspaceName: 'AI Assist Enterprise Operations',
      defaultSlaHoursUrgent: '1',
      defaultSlaHoursHigh: '4',
      defaultSlaHoursMedium: '8',
      defaultAgentName: 'Elena Rostova',
      aiAutoSuggest: 'true',
      aiDefaultTone: 'Professional & Technical',
      agentSignature: 'Best regards,\nElena Rostova — Senior Operations Engineer, AI Assist',
    };

    for (const [k, v] of Object.entries(defaultSettings)) {
      insertSetting.run(k, v);
    }
  });

  seedTx();
}

initSchema();
seedIfEmpty(false);
