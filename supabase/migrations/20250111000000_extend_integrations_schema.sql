-- Add extended integration fields to customers table
ALTER TABLE customers 
ADD COLUMN outreach_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN outreach_token TEXT,
ADD COLUMN outreach_refresh_token TEXT,
ADD COLUMN outreach_last_sync TIMESTAMPTZ,
ADD COLUMN salesloft_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN salesloft_token TEXT,
ADD COLUMN salesloft_refresh_token TEXT,
ADD COLUMN salesloft_last_sync TIMESTAMPTZ,
ADD COLUMN gong_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN gong_token TEXT,
ADD COLUMN gong_refresh_token TEXT,
ADD COLUMN gong_last_sync TIMESTAMPTZ,
ADD COLUMN gmail_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN gmail_token TEXT,
ADD COLUMN gmail_refresh_token TEXT,
ADD COLUMN gmail_last_sync TIMESTAMPTZ,
ADD COLUMN calendar_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN calendar_token TEXT,
ADD COLUMN calendar_refresh_token TEXT,
ADD COLUMN calendar_last_sync TIMESTAMPTZ,
ADD COLUMN zendesk_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN zendesk_token TEXT,
ADD COLUMN zendesk_refresh_token TEXT,
ADD COLUMN zendesk_last_sync TIMESTAMPTZ,
ADD COLUMN stripe_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN stripe_token TEXT,
ADD COLUMN stripe_refresh_token TEXT,
ADD COLUMN stripe_last_sync TIMESTAMPTZ,
ADD COLUMN slack_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN slack_token TEXT,
ADD COLUMN slack_refresh_token TEXT,
ADD COLUMN slack_last_sync TIMESTAMPTZ;

-- Create canonical events table for unified data storage
CREATE TABLE IF NOT EXISTS canonical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL, -- salesforce, hubspot, outreach, salesloft, gong, gmail, etc.
  event_type TEXT NOT NULL, -- email_sent, email_open, email_click, call, meeting, task, etc.
  subject TEXT,
  body TEXT,
  
  -- Entity relationships (normalized)
  deal_id UUID REFERENCES opportunities(id),
  account_id TEXT,
  contact_id TEXT,
  user_id TEXT,
  campaign_id TEXT,
  prospect_id TEXT,
  contact_ids TEXT[], -- array of email addresses
  
  -- Metrics and analytics
  opens INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  duration_minutes INTEGER,
  sentiment_score DECIMAL(5,2), -- -100 to 100
  outcome TEXT,
  
  -- External system IDs for reference
  external_ids JSONB DEFAULT '{}',
  
  -- AI-generated insights
  ai_topics TEXT[],
  ai_sentiment TEXT,
  ai_summary TEXT,
  ai_risk_score DECIMAL(5,2),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT canonical_events_customer_timestamp_check CHECK (timestamp <= created_at)
);

-- Create sequence performances table
CREATE TABLE IF NOT EXISTS sequence_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  sequence_id TEXT NOT NULL,
  sequence_name TEXT NOT NULL,
  source TEXT NOT NULL,
  total_prospects INTEGER DEFAULT 0,
  active_prospects INTEGER DEFAULT 0,
  replied_prospects INTEGER DEFAULT 0,
  booked_prospects INTEGER DEFAULT 0,
  reply_rate DECIMAL(5,2),
  meeting_rate DECIMAL(5,2),
  avg_response_time_hours DECIMAL(8,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, sequence_id, source)
);

-- Create call analyses table
CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  call_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  deal_id TEXT,
  participant_ids TEXT[],
  duration_minutes INTEGER,
  transcript_url TEXT,
  recording_url TEXT,
  
  -- AI sentiment analysis
  overall_sentiment TEXT CHECK (overall_sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score DECIMAL(5,2) CHECK (sentiment_score >= -100 AND sentiment_score <= 100),
  talk_listen_ratio DECIMAL(5,2),
  question_count INTEGER,
  competitor_mentions TEXT[],
  price_discussion BOOLEAN DEFAULT FALSE,
  buying_signals_count INTEGER DEFAULT 0,
  risk_signals_count INTEGER DEFAULT 0,
  
  Topics TEXT[],
  action_items TEXT[],
  next_steps JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Create marketing attribution table
CREATE TABLE IF NOT EXISTS marketing_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  touchpoint_id TEXT NOT NULL,
  campaign_id TEXT,
  contact_id TEXT,
  account_id TEXT,
  deal_id TEXT,
  touchpoint_type TEXT CHECK (touchpoint_type IN ('email_sent', 'email_open', 'email_click', 'form_submit', 'web_visit', 'webinar_attended')),
  timestamp TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  cost_cents INTEGER,
  channel TEXT,
  attribution_credit DECIMAL(5,2) CHECK (attribution_credit >= 0 AND attribution_credit <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create support analyses table
CREATE TABLE IF NOT EXISTS support_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  ticket_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL,
  account_id TEXT,
  contact_id TEXT,
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  category TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  resolution_time_hours DECIMAL(8,2),
  sentiment_score DECIMAL(5,2) CHECK (sentiment_score >= -100 AND sentiment_score <= 100),
  churning_risk DECIMAL(5,2) CHECK (churning_risk >= 0 AND churning_risk <= 100),
  expansion_opportunity DECIMAL(5,2) CHECK (expansion_opportunity >= 0 AND expansion_opportunity <= 100),
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Create workflow automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_conditions JSONB NOT NULL, -- event filters
  actions JSONB NOT NULL, -- what to execute
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  cooldown_minutes INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook subscriptions table
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  source_tool TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  failure_count INTEGER DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create data quality metrics table
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL, -- opportunities, accounts, contacts, events
  metric_type TEXT NOT NULL, -- completeness, accuracy, consistency, timeliness
  score DECIMAL(5,2) CHECK (score >= 0 AND score <= 100),
  issues_detected INTEGER DEFAULT 0,
  issues_resolved INTEGER DEFAULT 0,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, entity_type, metric_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_canonical_events_customer_timestamp ON canonical_events(customer_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_canonical_events_source_type ON canonical_events(source, event_type);
CREATE INDEX IF NOT EXISTS idx_canonical_events_deal_id ON canonical_events(deal_id);
CREATE INDEX IF NOT EXISTS idx_canonical_events_prospect_id ON canonical_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_canonical_events_touchpoint_gin ON canonical_events USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_sequence_performances_customer ON sequence_performances(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_customer ON call_analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_call_analyses_deal_id ON call_analyses(deal_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attributions_customer ON marketing_attributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_marketing_attributions_timestamp ON marketing_attributions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_support_analyses_customer ON support_analyses(customer_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_customer_active ON automation_rules(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_customer ON webhook_subscriptions(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_data_quality_metrics_customer ON data_quality_metrics(customer_id);

-- Update RLS policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables
CREATE POLICY "Users can view own canonical events"
  ON canonical_events FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own canonical events"
  ON canonical_events FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own sequence performances"
  ON sequence_performances FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own sequence performances"
  ON sequence_performances FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own call analyses"
  ON call_analyses FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own call analyses"
  ON call_analyses FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own marketing attributions"
  ON marketing_attributions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own marketing attributions"
  ON marketing_attributions FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own support analyses"
  ON support_analyses FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own support analyses"
  ON support_analyses FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own automation rules"
  ON automation_rules FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own automation rules"
  ON automation_rules FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own webhook subscriptions"
  ON webhook_subscriptions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own webhook subscriptions"
  ON webhook_subscriptions FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own data quality metrics"
  ON data_quality_metrics FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own data quality metrics"
  ON data_quality_metrics FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
