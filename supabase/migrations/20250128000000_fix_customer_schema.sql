-- Fix customer schema constraints and add escape hatches for authentication flow

-- Remove problematic unique constraint that prevents proper user linking
ALTER TABLE customers DROP CONSTRAINT IF EXISTS unique_user_id;

-- Add skip_onboarding flag to prevent redirect loops
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS skip_onboarding BOOLEAN DEFAULT FALSE;

-- Add last_activity_at to track user engagement  
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();

-- Add login_count to track authentication attempts
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Add email_verified_at for better user management
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create proper unique constraint on user_id only (what we actually need)
-- But only after cleaning any duplicates first
DO $$
BEGIN
    -- Handle potential duplicates by keeping the first record
    DELETE FROM customers a USING (
        SELECT MIN(ctid) AS keep_ctid, user_id
        FROM customers 
        WHERE user_id IS NOT NULL
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    ) b
    WHERE a.user_id = b.user_id AND a.ctid <> b.keep_ctid;
END $$;

-- Now add the unique constraint
ALTER TABLE customers 
ADD CONSTRAINT unique_customer_user_id UNIQUE (user_id);

-- Create index for better performance on the new fields
CREATE INDEX IF NOT EXISTS idx_customers_skip_onboarding ON customers(skip_onboarding);
CREATE INDEX IF NOT EXISTS idx_customers_last_activity ON customers(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_login_count ON customers(login_count DESC);

-- Create function to update login activity
CREATE OR REPLACE FUNCTION update_login_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = NOW();
    IF OLD.login_count IS NULL OR OLD.login_count = 0 THEN
        NEW.login_count = 1;
    ELSE
        NEW.login_count = OLD.login_count + 1;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update login activity on customer updates
DROP TRIGGER IF EXISTS update_customer_login_activity ON customers;
CREATE TRIGGER update_customer_login_activity 
    BEFORE UPDATE ON customers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_login_activity();

-- Create helper function to get customer safely
CREATE OR REPLACE FUNCTION get_customer_by_user_id(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    email TEXT,
    company_name TEXT,
    subscription_tier TEXT,
    skip_onboarding BOOLEAN,
    salesforce_connected BOOLEAN,
    hubspot_connected BOOLEAN,
    last_activity_at TIMESTAMPTZ,
    login_count INTEGER,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.email,
        c.company_name,
        c.subscription_tier,
        c.skip_onboarding,
        c.salesforce_connected,
        c.hubspot_connected,
        c.last_activity_at,
        c.login_count,
        c.created_at,
        c.updated_at
    FROM customers c
    WHERE c.user_id = p_user_id
    AND c.deleted_at IS NULL;
END;
$$ language plpgsql;

-- Create safe customer upsert function
CREATE OR REPLACE FUNCTION safe_upsert_customer(
    p_user_id UUID,
    p_email TEXT,
    p_company_name TEXT DEFAULT 'User',
    p_subscription_tier TEXT DEFAULT 'FREE'
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    email TEXT,
    company_name TEXT,
    subscription_tier TEXT,
    skip_onboarding BOOLEAN,
    created_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ
) AS $$
BEGIN
    -- Try to insert first
    INSERT INTO customers (
        user_id, 
        email, 
        company_name, 
        subscription_tier, 
        created_at, 
        last_activity_at
    ) VALUES (
        p_user_id, 
        p_email, 
        p_company_name, 
        p_subscription_tier, 
        NOW(), 
        NOW()
    )
    RETURNING 
        id, user_id, email, company_name, subscription_tier, 
        skip_onboarding, created_at, last_activity_at
    INTO 
        id, user_id, email, company_name, subscription_tier,
        skip_onboarding, created_at, last_activity_at;
    
EXCEPTION
    WHEN unique_violation THEN
        -- If unique violation, fetch existing
        SELECT 
            c.id, c.user_id, c.email, c.company_name, c.subscription_tier,
            c.skip_onboarding, c.created_at, c.last_activity_at
        INTO 
            id, user_id, email, company_name, subscription_tier,
            skip_onboarding, created_at, last_activity_at
        FROM customers c
        WHERE c.user_id = p_user_id
        AND c.deleted_at IS NULL;
        
        -- Update activity on fetch
        UPDATE customers 
        SET last_activity_at = NOW(), updated_at = NOW()
        WHERE user_id = p_user_id AND deleted_at IS NULL;
END;
$$ language plpgsql;

-- Add RLS policy for the new functions
CREATE POLICY "Users can access their own customer data via functions"
  ON customers FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can update their own customer data via functions"
  ON customers FOR UPDATE
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own customer data via functions"
  ON customers FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_customer_by_user_id TO authenticated;
GRANT EXECUTE ON FUNCTION safe_upsert_customer TO authenticated;

-- Clean up any NULL user_id records that could cause issues
UPDATE customers 
SET deleted_at = NOW() 
WHERE user_id IS NULL AND deleted_at IS NULL;
