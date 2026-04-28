-- Update existing schema to support RevOps Automation Platform
-- This migration preserves existing data while adding automation features

-- Update customers table to support the new automation features
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS status customer_status DEFAULT 'ACTIVE',
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Update existing customers records
UPDATE customers 
SET 
  name = COALESCE(
    name, 
    user_metadata->>'full_name', 
    email,
    'Unknown User'
  ),
  status = COALESCE(status, 'ACTIVE'),
  plan = COALESCE(plan, 'FREE'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  version = COALESCE(version, 1)
WHERE created_at IS NULL;

-- Add plan column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'FREE';

-- Update subscription_tier to use new plan structure
UPDATE customers 
SET subscription_tier = plan 
WHERE subscription_tier IS NULL AND plan IS NOT NULL;

-- Add missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_plan ON customers(plan);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);

-- Ensure id column exists (if not, add it)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'customers' 
                   AND column_name = 'id') THEN
        ALTER TABLE customers ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
END
$$;

-- Add risk_score and related fields to deals table
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
ADD COLUMN IF NOT EXISTS deal_age_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
ADD COLUMN IF NOT EXISTS engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 10),
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS product_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pipeline_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
ADD COLUMN IF NOT EXISTS forecast_category forecast_category DEFAULT 'PIPELINE';

-- Update existing deals with calculated values
UPDATE deals 
SET 
  risk_score = CASE 
    WHEN days_in_stage IS NULL OR days_in_stage = 0 THEN 25
    WHEN days_in_stage > 45 THEN 80
    WHEN days_in_stage > 21 THEN 55
    ELSE days_in_stage + 30
  END,
  risk_level = CASE 
    WHEN (days_in_stage IS NULL OR days_in_stage = 0) OR days_in_stage <= 21 THEN 'LOW'
    WHEN days_in_stage <= 45 THEN 'MEDIUM'
    ELSE 'HIGH'
  END,
  deal_age_days = COALESCE(
    EXTRACT(EPOCH FROM (created_at AT TIME ZONE 'utc')) / 86400, 
    0
  ),
  health_score = COALESCE(
    CASE 
      WHEN stage = 'QUALIFIED' THEN 30
      WHEN stage = 'DISCOVERY' THEN 40
      WHEN stage = 'DEMONSTRATION' THEN 50
      WHEN stage = 'PROPOSAL' THEN 60
      WHEN stage = 'NEGOTIATION' THEN 70
      WHEN stage = 'CLOSED_WON' THEN 100
      WHEN stage = 'CLOSED_LOST' THEN 0
      ELSE 30
    END,
    score
  ),
  engagement_score = 5,
  created_at = COALESCE(created_at, NOW()),
  updated_at = NOW(),
  ai_insights = '[]',
  risk_factors = CASE
    WHEN days_in_stage > 60 THEN jsonb_build_array('DEAL_STAGNATION')
    WHEN amount < 5000 THEN jsonb_build_array('LOW_VALUE')
    WHEN probability < 30 AND stage != 'CLOSED_WON' THEN jsonb_build_array('LOW_PROBABILITY')
    ELSE jsonb_build_array()
  END
WHERE created_at IS NOT NULL;

-- Create indexes for deal performance
CREATE INDEX IF NOT EXISTS idx_deals_risk_score ON deals(risk_score);
CREATE INDEX IF NOT EXISTS idx_deals_health_score ON deals(health_score);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_risk_level ON deals(risk_level);
CREATE INDEX IF NOT EXISTS idx_deals_deal_age_days ON deals(deal_age_days);

-- Add AI insights table (if not already exists from previous migration)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  insight_type insight_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity insight_severity DEFAULT 'MEDIUM',
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
  
  -- Context and targeting
  entity_type TEXT,
  entity_id UUID,
  time_period TEXT, -- LAST_7_DAYS, LAST_30_DAYS, CURRENT_QUARTER
  scope TEXT, -- INDIVIDUAL, ACCOUNT, TEAM, CUSTOMER-wide
  
  -- Content and recommendations
  recommendation TEXT,
  action_items JSONB DEFAULT '[]',
  supporting_data JSONB DEFAULT '{}',
  key_metrics JSONB DEFAULT '{}',
  
  -- AI processing metadata
  model_version TEXT,
  prompt_template TEXT,
  processing_time_ms INTEGER,
  token_count INTEGER,
  related_insights JSONB DEFAULT '[]', -- Array of related insight IDs
  
  -- Status and lifecycle
  status TEXT DEFAULT 'ACTIVE', -- ACTIVE, ACKNOWLEDGED, RESOLVED, EXPIRED
  expires_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  CONSTRAINT valid_status CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS idx_ai_insights_customer_id ON ai_insights(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_insights(insight_type);

-- Add events table for real-time tracking
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Event classification
  event_type TEXT NOT NULL,
  event_category event_category,
  source_system TEXT NOT NULL,
  external_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  
  -- Event data
  payload JSONB NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  
  -- Processing metadata
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sequence_number BIGSERIAL,
  batch_id UUID,
  processing_status TEXT DEFAULT 'PENDING',
  error_message TEXT,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient querying
  UNIQUE(customer_id, entity_type, entity_id, sequence_number),
  INDEX(customer_id, event_type, created_at),
  INDEX(event_type, created_at),
  INDEX(sequence_number),
  INDEX(entity_type, entity_id),
  INDEX(created_at)
);

-- Add metrics table for aggregated analytics
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Metric identification
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_period metric_period DEFAULT 'MONTHLY',
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Metric values
  metric_value DECIMAL(15,2),
  metric_count INTEGER DEFAULT 0,
  metric_average DECIMAL(10,2),
  
  -- Dimensions and filters
  dimensions JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  
  -- Calculation metadata
  calculation_method metric_calculation DEFAULT 'SUM',
  calculation_config JSONB DEFAULT '{}',
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combination of parameters
  UNIQUE(customer_id, metric_type, metric_name, metric_period, period_start_date, dimensions),
  INDEX(customer_id, metric_type, metric_name),
  INDEX(metric_period, period_start_date),
  INDEX(customer_id),
  INDEX(created_at)
);

-- Enable RLS on all tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policies for enhanced security
-- Customers - Only customers can access their own data
DROP POLICY IF EXISTS "customers_select_policy";
CREATE POLICY "customers_select_policy" ON customers
    FOR ALL
    TO authenticated, anon
    USING (auth.uid() = id);

-- Deals - Only customers can access their own deals, or deals they have permission for
DROP POLICY IF EXISTS "deals_select_policy";
CREATE POLICY "deals_select_policy" ON deals
    FOR ALL
    TO authenticated, anon
    USING (
      customer_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 FROM users u 
        JOIN auth.roles() r ON r.role = 'admin'
        WHERE u.id = auth.uid() AND u.customer_id = customer_id
      )
    );

-- AI Insights - Only customers can access their own insights
DROP POLICY IF EXISTS "ai_insights_select_policy";
CREATE POLICY "ai_insights_select_policy" ON ai_insights
    FOR ALL
    TO authenticated, anon
    USING (
      customer_id = auth.uid()
      OR 
      EXISTS (
        SELECT 1 FROM users u 
        JOIN auth.roles() r ON r.role = 'admin'
        WHERE u.id = auth.uid() AND u.customer_id = customer_id
      )
    );

-- Events - Only customers can access their own events
DROP POLICY IF EXISTS "events_select_policy";
CREATE POLICY "events_select_policy" ON events
    FOR ALL
    TO authenticated, anon
    USING (customer_id = auth.uid());

-- Metrics - Only customers can access their own metrics
DROP POLICY IF EXISTS "metrics_select_policy";
CREATE POLICY "metrics_select_policy" ON metrics
    FOR ALL
    TO authenticated, anon
    USING (customer_id = auth.uid());

-- Create views for better query performance
CREATE OR REPLACE VIEW pipeline_health_summary AS
SELECT 
  d.customer_id,
  d.stage,
  COUNT(*) as deal_count,
  SUM(COALESCE(d.amount, 0)) as total_amount,
  AVG(COALESCE(d.probability, 50)) as avg_probability,
  AVG(d.health_score) as avg_health_score,
  AVG(d.risk_score) as avg_risk_score,
  AVG(d.deal_age_days) as avg_age_in_days,
  COUNT(CASE WHEN d.risk_score > 70 THEN 1 END) as high_risk_deals,
  COUNT(CASE WHEN d.stage = 'CLOSED_WON' THEN 1 END) as won_deals,
  d.updated_at as last_updated
FROM deals d
WHERE d.deleted_at IS NULL
  AND d.customer_id IS NOT NULL
GROUP BY d.customer_id, d.stage
HAVING COUNT(*) > 0;

-- Materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS customer_metrics_summary AS
SELECT 
  c.id as customer_id,
  c.name,
  c.email,
  c.plan,
  c.status,
  COUNT(DISTINCT d.id) as total_deals,
  COALESCE(SUM(CASE WHEN d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST') THEN d.amount ELSE 0 END), 0) as active_pipeline,
  COALESCE(SUM(d.amount), 0) as total_pipeline_value,
  COALESCE(AVG(d.health_score), 0) as avg_health_score,
  COALESCE(AVG(d.risk_score), 0) as avg_risk_score,
  COALESCE(COUNT(CASE WHEN d.risk_score > 70 THEN 1 END), 0) as high_risk_count,
  COUNT(DISTINCT i.id) as total_insights,
  COUNT(DISTINCT CASE WHEN i.severity = 'CRITICAL' OR i.severity = 'HIGH' THEN 1 END) as critical_insights,
  MAX(d.updated_at) as last_activity
FROM customers c
LEFT JOIN deals d ON c.id = d.customer_id AND d.deleted_at IS NULL
LEFT JOIN ai_insights i ON c.id = i.customer_id AND i.deleted_at IS NULL
GROUP BY c.id, c.name, c.email, c.plan, c.status;

-- This will be refreshed every 5 minutes
CREATE OR REPLACE FUNCTION refresh_pipeline_health_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pipeline_health_summary;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing pipeline_health_summary: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh of the materialized view
DO $$
BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_cron.job 
      WHERE jobname = 'refresh_pipeline_health_summary'
    ) THEN
      PERFORM cron.schedule('refresh_pipeline_health_summary', '*/5 * * *', 'SELECT refresh_pipeline_health_summary();');
    END IF;
END
$$;

-- Function to generate sample metrics for testing/development
CREATE OR REPLACE FUNCTION generate_sample_metrics(
  p_customer_id UUID,
  p_metric_type TEXT,
  p_period_start_date DATE DEFAULT DATE_TRUNC(NOW(), 'month'),
  p_period_end_date DATE DEFAULT CURRENT_DATE,
  p_dimension_key TEXT DEFAULT NULL,
  p_dimension_value TEXT DEFAULT NULL
)
RETURNS TABLE AS $$
BEGIN
  RETURN QUERY
  WITH
    -- Sample pipeline metrics
    pipeline_metrics AS (
      SELECT
        gen_random_uuid() as id,
        p_customer_id as customer_id,
        'PIPELINE' as metric_type,
        CASE 
          WHEN 'total_amount' THEN 'total_pipeline'
          WHEN 'deal_count' THEN 'total_deals'
          WHEN 'avg_health' THEN 'avg_health_score'
          WHEN 'high_risk_count' THEN 'high_risk_deals'
          ELSE 'pipeline_summary'
        END as metric_name,
        p_metric_period as metric_period,
        p_period_start_date as period_start_date,
        p_period_end_date as period_end_date,
        CASE 
          WHEN 'total_amount' THEN 
            (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE customer_id = p_customer_id AND deleted_at IS NULL)
          WHEN 'deal_count' THEN 
            (SELECT COUNT(*) FROM deals WHERE customer_id = p_customer_id AND deleted_at IS NULL)
          WHEN 'avg_health' THEN 
            (SELECT COALESCE(AVG(health_score), 0) FROM deals WHERE customer_id = p_customer_id AND deleted_at IS NULL)
          WHEN 'high_risk_count' THEN 
            (SELECT COUNT(*) FROM deals WHERE customer_id = p_customer_id AND risk_score > 70 AND deleted_at IS NULL)
          ELSE 250000.00
        END as metric_value,
        CASE 
          WHEN 'deal_count' THEN COUNT(*)
          ELSE 1
        END as metric_count,
        CASE 
          WHEN 'total_amount' THEN (SELECT SUM(amount) / NULLIF(COUNT(*) = 0, 1, COUNT(*)) FROM deals WHERE customer_id = p_customer_id AND deleted_at IS NULL)
          ELSE COUNT(*) 
        END as metric_average,
        jsonb_build_object(
          CASE 
            WHEN p_dimension_key IS NOT NULL THEN 
              ARRAY[p_dimension_key, p_dimension_value]
            ELSE NULL
          END
        ) as dimensions,
        jsonb_build_object() as filters,
        'SUM' as calculation_method,
        jsonb_build_object() as calculation_config,
        NOW() as last_updated_at,
        NOW() as created_at
      FROM deals
      WHERE customer_id = p_customer_id AND deleted_at IS NULL
      GROUP BY 
        CASE 
          WHEN 'total_amount' THEN amount 
          WHEN 'deal_count' THEN NULL
        END,
        CASE 
          WHEN 'total_amount' THEN NULL
          ELSE NULL
        END,
        CASE 
          WHEN 'total_amount' THEN NULL
          WHEN 'deal_count' THEN NULL
          ELSE NULL
        END
    ),
    
    -- Activity metrics
    activity_metrics AS (
      SELECT
        gen_random_uuid() as id,
        p_customer_id as customer_id,
        'ACTIVITY' as metric_type,
        'total_activities' as metric_name,
        p_metric_period as metric_period,
        p_period_start_date as period_start_date,
        p_period_end_date as period_end_date,
        COUNT(*) as metric_value,
        1 as metric_count,
        1.0 as metric_average,
        jsonb_build_object(
          CASE 
            WHEN p_dimension_key IS NOT NULL THEN 
              ARRAY[p_dimension_key, p_dimension_value]
            ELSE NULL
          END
        ) as dimensions,
        jsonb_build_object() as filters,
        'COUNT' as calculation_method,
        jsonb_build_object() as calculation_config,
        NOW() as last_updated_at,
        NOW() as created_at
      FROM (
        SELECT created_at FROM activities WHERE customer_id = p_customer_id AND deleted_at IS NULL
      )
      GROUP BY 1
    )
    
    SELECT * FROM (
      SELECT * FROM pipeline_metrics
      UNION ALL
      SELECT * FROM activity_metrics
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to execute the function
GRANT EXECUTE ON FUNCTION generate_sample_metrics TO authenticated;
