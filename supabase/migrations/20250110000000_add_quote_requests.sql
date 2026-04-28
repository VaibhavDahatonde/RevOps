-- Create quote_requests table for sales leads
CREATE TABLE IF NOT EXISTS public.quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Contact Information
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT NOT NULL,
    phone TEXT,
    
    -- Company Details
    company_size TEXT NOT NULL, -- '1-10', '11-50', '51-200', '201-500', '500+'
    industry TEXT,
    
    -- Requirements
    current_crm TEXT[], -- ['salesforce', 'hubspot', 'pipedrive', etc.]
    estimated_pipeline_value TEXT, -- 'under_1m', '1m_10m', '10m_50m', '50m+'
    num_users INTEGER,
    annual_revenue TEXT, -- 'under_1m', '1m_10m', '10m_50m', '50m_100m', '100m+'
    
    -- Pain Points & Needs
    primary_challenges TEXT[], -- ['data_hygiene', 'forecasting', 'deal_velocity', etc.]
    additional_notes TEXT,
    
    -- Lead Qualification
    status TEXT DEFAULT 'new' NOT NULL, -- 'new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'
    estimated_value NUMERIC, -- Auto-calculated based on responses
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    
    -- Follow-up
    contacted_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    assigned_to TEXT, -- Sales rep email
    
    -- Metadata
    source TEXT DEFAULT 'website', -- 'website', 'referral', 'partner', etc.
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Add indexes for performance
CREATE INDEX idx_quote_requests_email ON public.quote_requests(email);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);
CREATE INDEX idx_quote_requests_created_at ON public.quote_requests(created_at DESC);
CREATE INDEX idx_quote_requests_priority ON public.quote_requests(priority);

-- Enable RLS
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only service role can read/write quote requests (internal sales team use)
CREATE POLICY "Service role has full access to quote_requests"
    ON public.quote_requests
    FOR ALL
    USING (auth.role() = 'service_role');

-- Function to calculate estimated deal value based on responses
CREATE OR REPLACE FUNCTION calculate_quote_value(
    company_size_param TEXT,
    pipeline_value_param TEXT,
    num_users_param INTEGER,
    annual_revenue_param TEXT
) RETURNS NUMERIC AS $$
DECLARE
    base_value NUMERIC := 0;
    size_multiplier NUMERIC := 1;
    pipeline_multiplier NUMERIC := 1;
BEGIN
    -- Base value by company size
    CASE company_size_param
        WHEN '1-10' THEN base_value := 1188; -- Starter annual
        WHEN '11-50' THEN base_value := 3588; -- Pro annual
        WHEN '51-200' THEN base_value := 12000;
        WHEN '201-500' THEN base_value := 25000;
        WHEN '500+' THEN base_value := 50000;
        ELSE base_value := 3588;
    END CASE;
    
    -- Pipeline multiplier
    CASE pipeline_value_param
        WHEN 'under_1m' THEN pipeline_multiplier := 0.8;
        WHEN '1m_10m' THEN pipeline_multiplier := 1.0;
        WHEN '10m_50m' THEN pipeline_multiplier := 1.5;
        WHEN '50m+' THEN pipeline_multiplier := 2.0;
        ELSE pipeline_multiplier := 1.0;
    END CASE;
    
    -- User multiplier (more users = higher value)
    IF num_users_param > 20 THEN
        size_multiplier := 1.5;
    ELSIF num_users_param > 10 THEN
        size_multiplier := 1.2;
    END IF;
    
    RETURN base_value * pipeline_multiplier * size_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate estimated value on insert
CREATE OR REPLACE FUNCTION set_quote_estimated_value()
RETURNS TRIGGER AS $$
BEGIN
    NEW.estimated_value := calculate_quote_value(
        NEW.company_size,
        NEW.estimated_pipeline_value,
        NEW.num_users,
        NEW.annual_revenue
    );
    
    -- Auto-set priority based on estimated value
    IF NEW.estimated_value >= 25000 THEN
        NEW.priority := 'urgent';
    ELSIF NEW.estimated_value >= 10000 THEN
        NEW.priority := 'high';
    ELSIF NEW.estimated_value >= 3000 THEN
        NEW.priority := 'medium';
    ELSE
        NEW.priority := 'low';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_quote_value
    BEFORE INSERT ON public.quote_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_quote_estimated_value();

-- Comments
COMMENT ON TABLE public.quote_requests IS 'Sales lead requests from Get Quote form';
COMMENT ON COLUMN public.quote_requests.estimated_value IS 'Auto-calculated annual contract value based on company profile';
COMMENT ON COLUMN public.quote_requests.priority IS 'Auto-assigned based on estimated deal size and profile';
