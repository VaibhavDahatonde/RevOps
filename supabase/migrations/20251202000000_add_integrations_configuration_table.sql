-- Create integrations table for storing tenant-specific credentials
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('salesforce', 'hubspot', 'gong', 'outreach', 'salesloft', 'stripe', 'slack', 'zendesk', 'gmail', 'calendar')),
  
  -- OAuth Configuration (Optional: If tenant provides their own app)
  client_id TEXT,
  client_secret TEXT,
  
  -- Connection Status
  is_connected BOOLEAN DEFAULT FALSE,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  instance_url TEXT,
  webhook_secret TEXT,
  settings JSONB DEFAULT '{}',
  
  -- Sync Status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, provider)
);

-- Enable RLS
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own integrations"
  ON integrations FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Index
CREATE INDEX IF NOT EXISTS idx_integrations_customer_provider ON integrations(customer_id, provider);
