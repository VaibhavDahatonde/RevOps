-- Add Lemon Squeezy fields to existing tables

-- Add Lemon Squeezy IDs to subscriptions table
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS lemonsqueezy_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT;

-- Add Lemon Squeezy customer ID to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS lemonsqueezy_customer_id TEXT;

-- Add Lemon Squeezy invoice ID to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS lemonsqueezy_invoice_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemonsqueezy_id 
  ON subscriptions(lemonsqueezy_subscription_id);

CREATE INDEX IF NOT EXISTS idx_customers_lemonsqueezy_id 
  ON customers(lemonsqueezy_customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_lemonsqueezy_id 
  ON invoices(lemonsqueezy_invoice_id);
