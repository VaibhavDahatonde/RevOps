-- Add missing columns and tables for RevOps automation platform
-- This is an incremental migration to add missing functionality
-- Created: 2025-12-01

-- Add missing columns to contacts table if they don't exist
DO $$
BEGIN
    -- Add account_id column to contacts if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'account_id') THEN
        ALTER TABLE contacts ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
    
    -- Add other missing contact columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'industry') THEN
        ALTER TABLE contacts ADD COLUMN industry TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'source_system') THEN
        ALTER TABLE contacts ADD COLUMN source_system TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'sync_token') THEN
        ALTER TABLE contacts ADD COLUMN sync_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'raw_data') THEN
        ALTER TABLE contacts ADD COLUMN raw_data JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'version') THEN
        ALTER TABLE contacts ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'is_decision_maker') THEN
        ALTER TABLE contacts ADD COLUMN is_decision_maker BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add missing columns to opportunities table if they don't exist
DO $$
BEGIN
    -- Account ID reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'account_id') THEN
        ALTER TABLE opportunities ADD COLUMN account_id UUID REFERENCES accounts(id);
    END IF;
    
    -- Contact ID reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'contact_id') THEN
        ALTER TABLE opportunities ADD COLUMN contact_id UUID REFERENCES contacts(id);
    END IF;
    
    -- Health scoring
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'health_score') THEN
        ALTER TABLE opportunities ADD COLUMN health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100);
    END IF;
    
    -- Activity tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'last_activity_date') THEN
        ALTER TABLE opportunities ADD COLUMN last_activity_date TIMESTAMPTZ;
    END IF;
    
    -- Days in stage calculation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'days_in_stage') THEN
        ALTER TABLE opportunities ADD COLUMN days_in_stage INTEGER;
    END IF;
    
    -- Risk factors
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'risk_factors') THEN
        ALTER TABLE opportunities ADD COLUMN risk_factors JSONB DEFAULT '[]';
    END IF;
    
    -- Next step tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'next_step') THEN
        ALTER TABLE opportunities ADD COLUMN next_step TEXT;
    END IF;
    
    -- Competitor tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'competitor') THEN
        ALTER TABLE opportunities ADD COLUMN competitor TEXT;
    END IF;
    
    -- Sales cycle tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'created_date') THEN
        ALTER TABLE opportunities ADD COLUMN created_date DATE DEFAULT CURRENT_DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'opportunities' AND column_name = 'sales_cycle_days') THEN
        ALTER TABLE opportunities ADD COLUMN sales_cycle_days INTEGER;
    END IF;
END $$;

-- Create missing tables that don't exist yet
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    external_id TEXT,
    
    -- Activity classification
    type TEXT NOT NULL CHECK (type IN ('EMAIL', 'CALL', 'MEETING', 'TASK', 'NOTE', 'WEB_VISIT', 'CUSTOM_EVENT', 'DEMO', 'PROPOSAL')),
    subtype TEXT,
    subject TEXT,
    description TEXT,
    
    -- Activity properties
    status TEXT CHECK (status IN ('COMPLETED', 'PENDING', 'CANCELLED', 'IN_PROGRESS')),
    priority TEXT CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    duration_minutes INTEGER,
    outcome TEXT,
    
    -- Relationships
    deal_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timing
    activity_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metrics and AI analysis
    engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    ai_insights JSONB,
    
    -- Provider-specific data
    source_system TEXT,
    provider_specific JSONB,
    raw_data JSONB
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Event classification
    event_type TEXT NOT NULL,
    event_category TEXT CHECK (event_category IN ('CRM', 'MARKETING', 'SALES', 'SUPPORT', 'BILLING', 'ANALYTICS')),
    source_system TEXT NOT NULL,
    external_id TEXT,
    
    -- Entity relationships
    entity_type TEXT,
    entity_id UUID,
    customer_entity_id TEXT,
    
    -- Event data
    payload JSONB NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    changed_fields JSONB,
    
    -- Processing metadata
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    sequence_number BIGSERIAL,
    batch_id UUID,
    processing_status TEXT DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSED', 'FAILED', 'RETRY')),
    processing_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Insight classification
    insight_type TEXT NOT NULL CHECK (insight_type IN ('RISK', 'OPPORTUNITY', 'TREND', 'ANOMALY', 'RECOMMENDATION', 'ALERT')),
    title TEXT NOT NULL,
    description TEXT,
    
    -- Impact assessment
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
    
    -- Context
    entity_type TEXT,
    entity_id UUID,
    time_period TEXT CHECK (time_period IN ('LAST_24_HOURS', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CURRENT_QUARTER', 'LAST_QUARTER')),
    
    -- Content
    recommendation TEXT,
    action_items JSONB DEFAULT '[]',
    supporting_data JSONB DEFAULT '{}',
    key_metrics JSONB DEFAULT '{}',
    
    -- Processing metadata
    model_used TEXT,
    model_version TEXT,
    processing_time_ms INTEGER,
    token_count INTEGER,
    
    -- Lifecycle
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXPIRED', 'DISMISSED')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ
);

-- Create indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON contacts(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_decision_maker ON contacts(is_decision_maker);

CREATE INDEX IF NOT EXISTS idx_opportunities_account_id ON opportunities(account_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_health_score ON opportunities(health_score);
CREATE INDEX IF NOT EXISTS idx_opportunities_last_activity ON opportunities(last_activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_activities_customer_id ON activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_account_id ON activities(account_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_owner_id ON activities(owner_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_engagement_score ON activities(engagement_score);

CREATE INDEX IF NOT EXISTS idx_events_customer_id ON events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_sequence_number ON events(sequence_number);

CREATE INDEX IF NOT EXISTS idx_ai_insights_customer_id ON ai_insights(customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_entity ON ai_insights(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_severity ON ai_insights(severity);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created ON ai_insights(created_at);

-- RLS for new tables
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS policies for new tables
CREATE POLICY "Users can manage own activities" ON activities FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "Users can view own events" ON events FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
CREATE POLICY "Users can manage own AI insights" ON ai_insights FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Updated at trigger for new tables
CREATE OR REPLACE FUNCTION update_activities_timestamp() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activities_timestamp BEFORE UPDATE ON activities FOR EACH ROW EXECUTE FUNCTION update_activities_timestamp();

-- Materialized views for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS pipeline_snapshot AS
SELECT 
    d.customer_id,
    d.stage,
    d.owner_id,
    COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as owner_name,
    COUNT(*) as deal_count,
    SUM(COALESCE(d.amount, 0)) as total_amount,
    AVG(COALESCE(d.probability, 0)) as avg_probability,
    AVG(COALESCE(d.health_score, 0)) as avg_health_score,
    COUNT(CASE WHEN d.health_score < 60 THEN 1 END) as at_risk_deals,
    SUM(CASE WHEN d.stage = 'CLOSED_WON' AND d.close_date >= CURRENT_DATE - INTERVAL '90 days' THEN COALESCE(d.amount, 0) ELSE 0 END) as won_amount_90_days,
    SUM(CASE WHEN d.stage = 'CLOSED_LOST' AND d.close_date >= CURRENT_DATE - INTERVAL '90 days' THEN COALESCE(d.amount, 0) ELSE 0 END) as lost_amount_90_days
FROM opportunities d
LEFT JOIN users u ON d.owner_id = u.id::text
WHERE d.stage NOT IN ('CLOSED_WON', 'CLOSED_LOST')
  AND d.close_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY d.customer_id, d.stage, d.owner_id, u.first_name, u.last_name;

CREATE INDEX IF NOT EXISTS idx_pipeline_snapshot_customer_stage ON pipeline_snapshot(customer_id, stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_snapshot_owner ON pipeline_snapshot(owner_id);

-- Success message
NOTICE 'RevOps automation schema successfully updated with missing tables and columns';
