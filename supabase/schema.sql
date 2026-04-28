-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  salesforce_connected BOOLEAN DEFAULT FALSE,
  salesforce_token TEXT,
  salesforce_refresh_token TEXT,
  salesforce_instance_url TEXT,
  salesforce_last_sync TIMESTAMPTZ,
  hubspot_connected BOOLEAN DEFAULT FALSE,
  hubspot_token TEXT,
  hubspot_refresh_token TEXT,
  hubspot_last_sync TIMESTAMPTZ,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('salesforce', 'hubspot')),
  name TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  stage TEXT,
  close_date DATE,
  probability INTEGER,
  owner_id TEXT,
  owner_name TEXT,
  account_id TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Closed deals table
CREATE TABLE IF NOT EXISTS closed_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('salesforce', 'hubspot')),
  amount NUMERIC DEFAULT 0,
  close_date DATE,
  created_date DATE,
  cycle_time_days INTEGER,
  owner_id TEXT,
  owner_name TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Metrics table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  total_pipeline NUMERIC DEFAULT 0,
  forecast NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  avg_deal_size NUMERIC DEFAULT 0,
  avg_cycle_time INTEGER DEFAULT 0,
  velocity NUMERIC DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights table
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('alert', 'insight', 'opportunity')),
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low', 'positive')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  impact TEXT,
  recommended_action TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'resolved')),
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('salesforce', 'hubspot')),
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  lifecycle_stage TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Sales reps table
CREATE TABLE IF NOT EXISTS sales_reps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('salesforce', 'hubspot')),
  name TEXT NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('salesforce', 'hubspot')),
  name TEXT NOT NULL,
  status TEXT,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, external_id, source)
);

-- Chat history table
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_source ON opportunities(source);
CREATE INDEX IF NOT EXISTS idx_closed_deals_customer_id ON closed_deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_metrics_customer_id ON metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_insights_customer_id ON insights(customer_id);
CREATE INDEX IF NOT EXISTS idx_insights_status ON insights(status);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE closed_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Users can view own customer record"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customer record"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer record"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for opportunities
CREATE POLICY "Users can view own opportunities"
  ON opportunities FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own opportunities"
  ON opportunities FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for closed_deals
CREATE POLICY "Users can view own closed deals"
  ON closed_deals FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own closed deals"
  ON closed_deals FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for metrics
CREATE POLICY "Users can view own metrics"
  ON metrics FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own metrics"
  ON metrics FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for insights
CREATE POLICY "Users can view own insights"
  ON insights FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own insights"
  ON insights FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for contacts
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own contacts"
  ON contacts FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for sales_reps
CREATE POLICY "Users can view own sales reps"
  ON sales_reps FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own sales reps"
  ON sales_reps FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own campaigns"
  ON campaigns FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for chat_history
CREATE POLICY "Users can view own chat history"
  ON chat_history FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own chat history"
  ON chat_history FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own reports"
  ON reports FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for activity_log
CREATE POLICY "Users can view own activity log"
  ON activity_log FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own activity log"
  ON activity_log FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

