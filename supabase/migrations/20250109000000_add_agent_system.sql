-- AI Agent System Tables
-- Tracks automated actions and agent runs for compliance and audit

-- Automated actions table (logs every AI action)
CREATE TABLE IF NOT EXISTS automated_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('data_hygiene', 'deal_risk', 'forecast', 'velocity', 'rep_performance')),
  action_type TEXT NOT NULL CHECK (action_type IN ('update_field', 'send_alert', 'create_task', 'schedule_meeting', 'adjust_forecast', 'escalate')),
  target_type TEXT NOT NULL CHECK (target_type IN ('opportunity', 'customer', 'metric', 'insight')),
  target_id UUID NOT NULL,
  
  -- What was done
  action_description TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  
  -- Why it was done
  reason TEXT NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 100),
  risk_score_before NUMERIC,
  risk_score_after NUMERIC,
  
  -- Compliance
  status TEXT DEFAULT 'executed' CHECK (status IN ('executed', 'failed', 'rolled_back', 'pending_approval')),
  requires_approval BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Audit
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);

-- Agent runs table (tracks each agent execution)
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL,
  
  -- Execution details
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  -- Results
  opportunities_analyzed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  errors_encountered INTEGER DEFAULT 0,
  
  -- Performance
  execution_time_ms INTEGER,
  ai_tokens_used INTEGER,
  
  -- Impact
  impact_summary JSONB,
  error_details TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Impact metrics table (aggregate results)
CREATE TABLE IF NOT EXISTS impact_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Hygiene metrics
  pipeline_hygiene_score NUMERIC DEFAULT 0,
  fields_auto_filled INTEGER DEFAULT 0,
  data_quality_improvement NUMERIC DEFAULT 0,
  
  -- Risk metrics
  high_risk_deals_count INTEGER DEFAULT 0,
  deals_prevented_from_slipping INTEGER DEFAULT 0,
  average_risk_score NUMERIC DEFAULT 0,
  
  -- Forecast metrics
  forecast_accuracy NUMERIC DEFAULT 0,
  forecast_adjustments_made INTEGER DEFAULT 0,
  predicted_close_date_accuracy NUMERIC DEFAULT 0,
  
  -- Velocity metrics
  avg_sales_cycle_days INTEGER DEFAULT 0,
  velocity_improvement_percent NUMERIC DEFAULT 0,
  deals_accelerated INTEGER DEFAULT 0,
  
  -- Overall impact
  total_actions_taken INTEGER DEFAULT 0,
  total_ai_interventions INTEGER DEFAULT 0,
  estimated_revenue_impact NUMERIC DEFAULT 0,
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_automated_actions_customer_id ON automated_actions(customer_id);
CREATE INDEX IF NOT EXISTS idx_automated_actions_agent_type ON automated_actions(agent_type);
CREATE INDEX IF NOT EXISTS idx_automated_actions_executed_at ON automated_actions(executed_at);
CREATE INDEX IF NOT EXISTS idx_automated_actions_status ON automated_actions(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_customer_id ON agent_runs(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_impact_metrics_customer_id ON impact_metrics(customer_id);

-- Enable Row Level Security
ALTER TABLE automated_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automated_actions
CREATE POLICY "Users can view own automated actions"
  ON automated_actions FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own automated actions"
  ON automated_actions FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for agent_runs
CREATE POLICY "Users can view own agent runs"
  ON agent_runs FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own agent runs"
  ON agent_runs FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- RLS Policies for impact_metrics
CREATE POLICY "Users can view own impact metrics"
  ON impact_metrics FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own impact metrics"
  ON impact_metrics FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
