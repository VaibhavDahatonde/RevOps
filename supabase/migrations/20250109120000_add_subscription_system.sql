-- Subscription System Migration
-- Creates tables for managing subscriptions, usage tracking, and billing

-- ============================================
-- 1. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Plan details
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'starter', 'professional', 'enterprise')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  
  -- Trial information
  trial_ends_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  
  -- Billing periods
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  
  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- 2. USAGE METRICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  
  -- Billing period this tracks
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Usage counters
  records_count INTEGER DEFAULT 0,
  ai_actions_count INTEGER DEFAULT 0,
  users_count INTEGER DEFAULT 1,
  crm_connections_count INTEGER DEFAULT 0,
  agent_runs_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per customer per period
  UNIQUE(customer_id, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_metrics_customer_id ON usage_metrics(customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);

-- ============================================
-- 3. INVOICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  stripe_invoice_id TEXT UNIQUE,
  invoice_number TEXT,
  amount_due INTEGER NOT NULL, -- in cents
  amount_paid INTEGER DEFAULT 0, -- in cents
  currency TEXT DEFAULT 'usd',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  
  -- Dates
  invoice_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- PDF
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================
-- 4. UPDATE CUSTOMERS TABLE
-- ============================================
-- Add onboarding and trial tracking columns
ALTER TABLE customers 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS selected_plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Usage metrics policies
CREATE POLICY "Users can view their own usage metrics"
  ON usage_metrics FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own usage metrics"
  ON usage_metrics FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own usage metrics"
  ON usage_metrics FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Invoices policies
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to create initial subscription on customer creation
CREATE OR REPLACE FUNCTION create_initial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (
    customer_id,
    plan_tier,
    status,
    trial_started_at,
    trial_ends_at,
    current_period_start,
    current_period_end
  ) VALUES (
    NEW.id,
    COALESCE(NEW.selected_plan, 'free'),
    CASE 
      WHEN NEW.selected_plan IN ('starter', 'professional') THEN 'trialing'
      ELSE 'active'
    END,
    CASE 
      WHEN NEW.selected_plan IN ('starter', 'professional') THEN NOW()
      ELSE NULL
    END,
    CASE 
      WHEN NEW.selected_plan IN ('starter', 'professional') THEN NOW() + INTERVAL '14 days'
      ELSE NULL
    END,
    NOW(),
    NOW() + INTERVAL '1 month'
  );
  
  -- Create initial usage metrics record
  INSERT INTO usage_metrics (
    customer_id,
    period_start,
    period_end,
    users_count
  ) VALUES (
    NEW.id,
    NOW(),
    NOW() + INTERVAL '1 month',
    1
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription
DROP TRIGGER IF EXISTS on_customer_created ON customers;
CREATE TRIGGER on_customer_created
  AFTER INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION create_initial_subscription();

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION increment_usage(
  p_customer_id UUID,
  p_metric TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get current billing period
  SELECT current_period_start, current_period_end
  INTO v_period_start, v_period_end
  FROM subscriptions
  WHERE customer_id = p_customer_id;
  
  -- Update or insert usage metric
  IF p_metric = 'records' THEN
    UPDATE usage_metrics
    SET records_count = records_count + p_amount,
        updated_at = NOW()
    WHERE customer_id = p_customer_id
      AND period_start = v_period_start
      AND period_end = v_period_end;
  ELSIF p_metric = 'ai_actions' THEN
    UPDATE usage_metrics
    SET ai_actions_count = ai_actions_count + p_amount,
        updated_at = NOW()
    WHERE customer_id = p_customer_id
      AND period_start = v_period_start
      AND period_end = v_period_end;
  ELSIF p_metric = 'agent_runs' THEN
    UPDATE usage_metrics
    SET agent_runs_count = agent_runs_count + p_amount,
        updated_at = NOW()
    WHERE customer_id = p_customer_id
      AND period_start = v_period_start
      AND period_end = v_period_end;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded limits
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_customer_id UUID,
  p_metric TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_tier TEXT;
  v_current_usage INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get plan tier
  SELECT plan_tier INTO v_plan_tier
  FROM subscriptions
  WHERE customer_id = p_customer_id;
  
  -- Get current usage
  SELECT 
    CASE p_metric
      WHEN 'records' THEN records_count
      WHEN 'ai_actions' THEN ai_actions_count
      WHEN 'users' THEN users_count
      WHEN 'crm_connections' THEN crm_connections_count
      WHEN 'agent_runs' THEN agent_runs_count
    END INTO v_current_usage
  FROM usage_metrics
  WHERE customer_id = p_customer_id
    AND period_start <= NOW()
    AND period_end >= NOW()
  LIMIT 1;
  
  -- Set limits based on plan
  v_limit := CASE 
    WHEN v_plan_tier = 'free' THEN
      CASE p_metric
        WHEN 'records' THEN 100
        WHEN 'ai_actions' THEN 100
        WHEN 'users' THEN 1
        WHEN 'crm_connections' THEN 1
        WHEN 'agent_runs' THEN 10
      END
    WHEN v_plan_tier = 'starter' THEN
      CASE p_metric
        WHEN 'records' THEN 10000
        WHEN 'ai_actions' THEN 5000
        WHEN 'users' THEN 3
        WHEN 'crm_connections' THEN 2
        WHEN 'agent_runs' THEN 200
      END
    WHEN v_plan_tier = 'professional' THEN
      CASE p_metric
        WHEN 'records' THEN 100000
        WHEN 'ai_actions' THEN 50000
        WHEN 'users' THEN 9999999 -- Unlimited
        WHEN 'crm_connections' THEN 9999999 -- Unlimited
        WHEN 'agent_runs' THEN 9999999 -- Unlimited
      END
    WHEN v_plan_tier = 'enterprise' THEN 9999999 -- Unlimited for all
  END;
  
  -- Return true if under limit, false if over
  RETURN COALESCE(v_current_usage, 0) < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. UPDATE EXISTING CUSTOMERS
-- ============================================
-- Create subscriptions for existing customers
INSERT INTO subscriptions (customer_id, plan_tier, status)
SELECT 
  id,
  COALESCE(subscription_tier, 'free'),
  'active'
FROM customers
WHERE id NOT IN (SELECT customer_id FROM subscriptions)
ON CONFLICT (customer_id) DO NOTHING;

-- Create usage metrics for existing customers
INSERT INTO usage_metrics (customer_id, period_start, period_end)
SELECT 
  id,
  NOW(),
  NOW() + INTERVAL '1 month'
FROM customers
WHERE id NOT IN (SELECT customer_id FROM usage_metrics)
ON CONFLICT (customer_id, period_start, period_end) DO NOTHING;

-- Update usage metrics with current record counts
UPDATE usage_metrics um
SET 
  records_count = (
    SELECT COUNT(*) 
    FROM opportunities o 
    WHERE o.customer_id = um.customer_id
  ),
  crm_connections_count = (
    SELECT 
      (CASE WHEN c.salesforce_connected THEN 1 ELSE 0 END) +
      (CASE WHEN c.hubspot_connected THEN 1 ELSE 0 END)
    FROM customers c
    WHERE c.id = um.customer_id
  )
WHERE um.period_start <= NOW() AND um.period_end >= NOW();
