-- Remove Lemon Squeezy integration fields
-- This rollback removes all LemonSqueezy-related columns from the database

-- Drop indexes first
DROP INDEX IF EXISTS idx_subscriptions_lemonsqueezy_id;
DROP INDEX IF EXISTS idx_customers_lemonsqueezy_id;
DROP INDEX IF EXISTS idx_invoices_lemonsqueezy_id;

-- Remove LemonSqueezy columns from subscriptions table
ALTER TABLE subscriptions
  DROP COLUMN IF EXISTS lemonsqueezy_subscription_id,
  DROP COLUMN IF EXISTS lemonsqueezy_customer_id;

-- Remove LemonSqueezy column from customers table
ALTER TABLE customers
  DROP COLUMN IF EXISTS lemonsqueezy_customer_id;

-- Remove LemonSqueezy column from invoices table
ALTER TABLE invoices
  DROP COLUMN IF EXISTS lemonsqueezy_invoice_id;

-- Comment
COMMENT ON TABLE subscriptions IS 'Subscription management - LemonSqueezy fields removed, using custom quote system instead';
