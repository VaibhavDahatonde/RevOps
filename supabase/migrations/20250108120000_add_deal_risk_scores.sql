-- Deal risk scores table
CREATE TABLE IF NOT EXISTS deal_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Overall risk score (0-100)
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  
  -- Individual risk factors (0-100 each)
  stale_activity_score INTEGER DEFAULT 0,
  velocity_score INTEGER DEFAULT 0,
  stage_time_score INTEGER DEFAULT 0,
  missing_data_score INTEGER DEFAULT 0,
  
  -- Metrics used for calculation
  days_since_last_activity INTEGER,
  days_in_current_stage INTEGER,
  expected_stage_duration INTEGER,
  velocity_vs_average NUMERIC, -- Multiplier: 1.0 = average, 0.5 = half speed, 2.0 = double speed
  missing_fields TEXT[], -- Array of missing critical fields
  
  -- Predictions
  predicted_close_date DATE,
  likelihood_to_close INTEGER CHECK (likelihood_to_close >= 0 AND likelihood_to_close <= 100),
  likelihood_to_slip INTEGER CHECK (likelihood_to_slip >= 0 AND likelihood_to_slip <= 100),
  
  -- Prescriptive actions
  recommended_actions JSONB, -- Array of action objects
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(opportunity_id)
);

-- Add risk_score column to opportunities table for quick access
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS risk_score INTEGER;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high'));
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS days_since_update INTEGER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deal_risk_scores_opportunity_id ON deal_risk_scores(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_deal_risk_scores_customer_id ON deal_risk_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_deal_risk_scores_risk_level ON deal_risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_deal_risk_scores_risk_score ON deal_risk_scores(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_risk_score ON opportunities(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_risk_level ON opportunities(risk_level);

-- Enable Row Level Security
ALTER TABLE deal_risk_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own deal risk scores"
  ON deal_risk_scores FOR SELECT
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own deal risk scores"
  ON deal_risk_scores FOR ALL
  USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deal_risk_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deal_risk_scores_timestamp
  BEFORE UPDATE ON deal_risk_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_deal_risk_scores_updated_at();
