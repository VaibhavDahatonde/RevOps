# Unified GTM Data Model & Database Schema

## Core Design Principles
1. **Canonical Data Model**: Single source of truth for all GTM data
2. **Event-driven**: Every change captured as immutable events
3. **Normalization**: Consistent structure across all integrations
4. **Scalability**: Optimized for high-volume real-time processing
5. **Auditability**: Complete history of all data changes

## Unified Data Model

### 1. Core Entities

#### Accounts (Companies)
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  external_id TEXT, -- Salesforce/HubSpot ID
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size_category TEXT, -- SMB, MID-MARKET, ENTERPRISE
  arr DECIMAL(12,2),
  health_score INTEGER, -- 0-100
  lifecycle_stage TEXT, -- LEAD, MQL, SQL, ACTIVE, CHURNED
  tier TEXT, -- FREE, GROWTH, PRO, ENTERPRISE
  billing_status TEXT, -- ACTIVE, CANCELED, PAST_DUE
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  source_system TEXT, -- salesforce, hubspot, manual
  sync_token TEXT, -- For incremental syncs
  raw_data JSONB, -- Original provider data
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX idxAccountsExternalId ON accounts(external_id);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_lifecycle_stage ON accounts(lifecycle_stage);
```

#### Deals (Opportunities)
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  external_id TEXT,
  name TEXT NOT NULL,
  amount DECIMAL(12,2),
  currency TEXT DEFAULT 'USD',
  stage TEXT NOT NULL, --QUALIFIED, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST
  probability INTEGER, -- 0-100
  close_date DATE,
  created_date DATE DEFAULT CURRENT_DATE,
  owner_id UUID REFERENCES users(id),
  source TEXT, -- OUTBOUND, INBOUND, PARTNER, REFERRAL
  campaign_id UUID REFERENCES campaigns(id),
  deal_type TEXT, -- NEW, EXPANSION, RENEWAL, CHURN
  forecast_category TEXT, -- PIPELINE, BEST_CASE, COMMIT, Omitted
  health_score INTEGER, -- 0-100
  risk_factors JSONB, -- AI-detected risks
  next_step TEXT,
  days_in_stage INTEGER,
  last_activity_date DATE,
  competitor TEXT,
  sales_cycle_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_deals_customer_id ON deals(customer_id);
CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_close_date ON deals(close_date);
CREATE INDEX idx_deals_health_score ON deals(health_score);
```

#### Contacts (People)
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  external_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  title TEXT,
  department TEXT,
  seniority_level TEXT, -- INDIVIDUAL, MANAGER, DIRECTOR, VP, C_LEVEL
  lead_source TEXT,
  is_decision_maker BOOLEAN DEFAULT FALSE,
  is Influencer BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB,
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_lead_source ON contacts(lead_source);
```

### 2. Activity & Engagement

#### Activities (All touchpoints)
```sql
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  external_id TEXT,
  type TEXT NOT NULL, -- EMAIL, CALL, MEETING, TASK, NOTE, WEB_VISIT, CUSTOM_EVENT
  subtype TEXT, -- SENT, RECEIVED, OPENED, CLICKED, REPLIED, COMPLETED
  subject TEXT,
  description TEXT,
  status TEXT, -- COMPLETED, PENDING, CANCELLED
  priority TEXT, -- LOW, MEDIUM, HIGH, URGENT
  duration_minutes INTEGER,
  
  -- Relationships
  deal_id UUID REFERENCES deals(id),
  account_id UUID REFERENCES accounts(id),
  contact_id UUID REFERENCES contacts(id),
  owner_id UUID REFERENCES users(id),
  campaign_id UUID REFERENCES campaigns(id),
  
  -- Timing
  activity_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  source_system TEXT, -- salesforce, outreach, gong, gmail, etc.
  provider_specific JSONB, -- Provider-specific fields
  engagement_score INTEGER, -- Calculated engagement level
  sentiment_score DECIMAL(3,2), -- -1 to 1 sentiment analysis
  ai_insights JSONB, -- AI-generated insights
  raw_data JSONB
);

CREATE INDEX idx_activities_customer_id ON activities(customer_id);
CREATE INDEX idx_activities_deal_id ON activities(deal_id);
CREATE INDEX idx_activities_contact_id ON activities(contact_id);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_activities_activity_date ON activities(activity_date);
CREATE INDEX idx_activities_engagement_score ON activities(engagement_score);
```

#### Marketing Campaigns & Touches
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  external_id TEXT,
  name TEXT NOT NULL,
  type TEXT, -- EMAIL, SOCIAL, WEBINAR, EVENTS, CONTENT, PAID_MEDIA
  status TEXT, -- DRAFT, ACTIVE, PAUSED, COMPLETED
  start_date DATE,
  end_date DATE,
  budget DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  target_audience TEXT,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT,
  sync_token TEXT,
  raw_data JSONB
);

CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  campaign_id UUID REFERENCES campaigns(id),
  contact_id UUID REFERENCES contacts(id),
  account_id UUID REFERENCES accounts(id),
  status TEXT, -- SENT, DELIVERED, OPENED, CLICKED, CONVERTED, BOUNCED
  first_opened_at TIMESTAMP WITH TIME ZONE,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  conversion_date DATE,
  conversion_value DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT
);

CREATE INDEX idx_campaign_members_customer_id ON campaign_members(customer_id);
CREATE INDEX idx_campaign_members_campaign_id ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_contact_id ON campaign_members(contact_id);
```

#### Support Events
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  external_id TEXT,
  account_id UUID REFERENCES accounts(id),
  contact_id UUID REFERENCES contacts(id),
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT, -- NEW, IN_PROGRESS, PENDING_CUSTOMER, RESOLVED, CLOSED
  priority TEXT, -- LOW, MEDIUM, HIGH, CRITICAL
  category TEXT,
  type TEXT, -- QUESTION, INCIDENT, PROBLEM, TASK
  satisfaction_score INTEGER, -- 1-5 CSAT
  first_response_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_to_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- AI Analysis
  sentiment_score DECIMAL(3,2),
  urgency_score INTEGER,
  churn_risk_indicator BOOLEAN,
  ai_recommendations JSONB,
  
  source_system TEXT, -- zendesk, freshdesk
  raw_data JSONB
);

CREATE INDEX idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX idx_support_tickets_account_id ON support_tickets(account_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
```

### 3. Billing & Revenue

#### Subscriptions & Billing
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  external_id TEXT,
  name TEXT,
  status TEXT NOT NULL, -- ACTIVE, CANCELED, PAST_DUE, TRIALING
  plan_name TEXT,
  plan_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  billing_interval TEXT, -- MONTHLY, YEARLY
  quantity INTEGER DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Revenue recognition
  recognized_revenue DECIMAL(12,2),
  arr_impact DECIMAL(12,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT, -- stripe, chargebee
  raw_data JSONB
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  account_id UUID REFERENCES accounts(id),
  external_id TEXT,
  number TEXT,
  status TEXT, -- DRAFT, OPEN, PAID, VOID, UNCREDITIBLE
  amount DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  source_system TEXT,
  raw_data JSONB
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
```

### 4. Events & Analytics

#### Event Stream (Immutable)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  event_type TEXT NOT NULL,
  event_category TEXT, -- CRM, MARKETING, SALES, SUPPORT, BILLING
  source_system TEXT NOT NULL,
  external_id TEXT,
  entity_type TEXT, -- DEAL, ACCOUNT, CONTACT, CAMPAIGN, etc.
  entity_id UUID,
  
  -- Event data
  payload JSONB NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  
  -- Metadata
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number BIGSERIAL,
  batch_id UUID,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_customer_id ON events(customer_id);
CREATE INDEX idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);
CREATE INDEX idx_events_sequence_number ON events(sequence_number);
```

#### Metrics & Analytics
```sql
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  metric_type TEXT NOT NULL, -- FUNNEL, FORECAST, ACTIVITY, HEALTH
  metric_name TEXT NOT NULL, -- PIPELINE_VALUE, WIN_RATE, DEAL_VELOCITY
  metric_value DECIMAL(12,2),
  metric_period TEXT, -- DAILY, WEEKLY, MONTHLY, QUARTERLY
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Dimensions
  dimensions JSONB, -- {owner: "john", stage: "proposal", region: "us-west"}
  
  -- Calculation metadata
  calculation_method TEXT, -- SUM, AVG, COUNT, CUSTOM_FORMULA
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metrics_unique ON metrics(customer_id, metric_type, metric_name, metric_period, period_start_date, (dimensions::text));
CREATE INDEX idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX idx_metrics_period ON metrics(metric_period, period_start_date);
```

### 5. AI & Insights

#### AI Insights
```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  insight_type TEXT NOT NULL, -- RISK, OPPORTUNITY, TREND, ANOMALY
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT, -- LOW, MEDIUM, HIGH, CRITICAL
  confidence_score DECIMAL(3,2), -- 0-1
  impact_score INTEGER, -- 1-10
  
  -- Context
  entity_type TEXT, -- DEAL, ACCOUNT, REP, TEAM
  entity_id UUID,
  time_period TEXT, -- LAST_7_DAYS, LAST_30_DAYS, CURRENT_QUARTER
  
  -- Content
  recommendation TEXT,
  action_items JSONB,
  supporting_data JSONB,
  
  -- Processing
  model_used TEXT,
  processing_time_ms INTEGER,
  token_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id)
);

CREATE INDEX idx_ai_insights_customer_id ON ai_insights(customer_id);
CREATE INDEX idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
```

#### Reports
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- WEEKLY, MONTHLY, QUARTERLY, CUSTOM
  template_id TEXT, -- Template reference
  period_start_date DATE,
  period_end_date DATE,
  
  -- Generated content
  content JSONB, -- Structured report data
  summary TEXT, -- Executive summary
  key_insights JSONB, -- Array of key insights
  recommendations JSONB, -- Array of recommendations
  
  -- Formatting
  format_type TEXT, -- PDF, PPTX, HTML, JSON
  file_url TEXT, -- Storage location
  
  -- Generation metadata
  generated_by TEXT, -- SYSTEM, USER, SCHEDULED
  generation_time_ms INTEGER,
  model_version TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Distribution
  delivery_schedule JSONB, -- When and where to send
  last_sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reports_customer_id ON reports(customer_id);
CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_period ON reports(period_start_date, period_end_date);
```

### 6. System & Integration

#### Integrations
```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  provider TEXT NOT NULL, -- salesforce, hubspot, outreach, etc.
  name TEXT NOT NULL,
  status TEXT NOT NULL, -- ACTIVE, INACTIVE, ERROR, PENDING
  configuration JSONB,
  
  -- Authentication
  auth_type TEXT, -- OAUTH2, API_KEY, BASIC
  credentials JSONB, -- Encrypted
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Sync settings
  sync_frequency TEXT, -- REAL_TIME, HOURLY, DAILY
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT, -- SUCCESS, ERROR, IN_PROGRESS
  sync_error TEXT,
  
  -- Capabilities
  supported_events JSONB, -- Array of supported event types
  configured_events JSONB, -- Array of configured webhook events
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_integrations_customer_id ON integrations(customer_id);
CREATE INDEX idx_integrations_provider ON integrations(provider);
CREATE INDEX idx_integrations_status ON integrations(status);
```

#### Users & Teams
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT, -- ADMIN, SALES_REP, MARKETING, SUPPORT, VIEWER
  title TEXT,
  
  -- External mapping
  external_id TEXT, -- Salesforce/HubSpot user ID
  source_system TEXT,
  
  -- Preferences
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB,
  dashboard_preferences JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(customer_id, email)
);

CREATE INDEX idx_users_customer_id ON users(customer_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### CRM Hygiene Rules
```sql
CREATE TABLE hygiene_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL, -- FIELD_VALIDATION, BUSINESS_RULE, DATA_QUALITY
  severity TEXT, -- LOW, MEDIUM, HIGH, CRITICAL
  entity_type TEXT NOT NULL, -- DEAL, ACCOUNT, CONTACT
  
  -- Rule definition
  condition JSONB NOT NULL, -- JSON logic for rule evaluation
  action JSONB NOT NULL, -- What to do when rule triggers
  auto_fix BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE hygiene_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rule_id UUID REFERENCES hygiene_rules(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  severity TEXT,
  description TEXT,
  recommendation TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED, IGNORED
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  
  -- Auto-fix tracking
  auto_fix_attempted BOOLEAN DEFAULT FALSE,
  auto_fix_success BOOLEAN,
  auto_fix_error TEXT
);

CREATE INDEX idx_hygiene_issues_customer_id ON hygiene_issues(customer_id);
CREATE INDEX idx_hygiene_issues_entity ON hygiene_issues(entity_type, entity_id);
CREATE INDEX idx_hygiene_issues_status ON hygiene_issues(status);
```

## Data Relationships

### Key Foreign Key Relationships
```sql
-- Account hierarchy
accounts.id → deals.account_id
accounts.id → contacts.account_id
accounts.id → subscriptions.account_id

-- Deal relationships
deals.id → activities.deal_id
deals.id → ai_insights.entity_id (when entity_type = 'DEAL')

-- Contact relationships
contacts.id → activities.contact_id
contacts.id → campaign_members.contact_id

-- Campaign relationships
campaigns.id → campaign_members.campaign_id
campaigns.id → deals.campaign_id

-- Event tracking
events.entity_id → All entity tables
activities.id → events.entity_id (when entity_type = 'ACTIVITY')
```

## Real-time Data Synchronization

### Change Data Capture (CDC)
```sql
-- Track all changes for real-time updates
CREATE TABLE change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  changed_fields JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  customer_id UUID NOT NULL REFERENCES customers(id)
);

CREATE INDEX idx_change_log_table_record ON change_log(table_name, record_id);
CREATE INDEX idx_change_log_customer_id ON change_log(customer_id);
CREATE INDEX idx_change_log_changed_at ON change_log(changed_at);
```

### Materialized Views for Performance
```sql
-- Pipeline snapshot
CREATE MATERIALIZED VIEW pipeline_snapshot AS
SELECT 
  d.customer_id,
  d.stage,
  COUNT(*) as deal_count,
  SUM(d.amount) as total_amount,
  AVG(d.probability) as avg_probability,
  d.owner_id
FROM deals d
WHERE d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
  AND d.close_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY d.customer_id, d.stage, d.owner_id;

-- Account health summary
CREATE MATERIALIZED VIEW account_health_summary AS
SELECT 
  a.customer_id,
  a.id as account_id,
  a.name,
  a.health_score,
  a.lifecycle_stage,
  a.arr,
  COUNT(DISTINCT d.id) as active_deals,
  SUM(CASE WHEN d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST') THEN d.amount ELSE 0 END) as pipeline_amount,
  COUNT(DISTINCT st.id) as open_tickets,
  AVG(CASE WHEN st.satisfaction_score IS NOT NULL THEN st.satisfaction_score END) as avg_csat
FROM accounts a
LEFT JOIN deals d ON a.id = d.account_id
LEFT JOIN support_tickets st ON a.id = st.account_id AND st.status IN ('NEW', 'IN_PROGRESS')
GROUP BY a.customer_id, a.id, a.name, a.health_score, a.lifecycle_stage, a.arr;
```

## Data Migration Strategy

### Phase 1: Core Schema Migration
1. Create all tables with proper indexes
2. Set up foreign key constraints
3. Create triggers for change tracking
4. Initialize materialized views

### Phase 2: Data Import & Normalization
1. Import existing customer data
2. Normalize to canonical format
3. Create historical event records
4. Validate data integrity

### Phase 3: Real-time Integration
1. Enable webhook endpoints
2. Set up event processing
3. Configure CDC triggers
4. Test end-to-end flow

### Performance Optimizations
1. **Index Strategy**: Composite indexes for common query patterns
2. **Partitioning**: Time-based partitioning for events table
3. **Caching**: Redis layer for frequently accessed data
4. **Materialized Views**: Pre-computed complex aggregations
5. **Query Optimization**: Prepared statements and query plans
