-- Core Dependencies Migration
-- This migration creates the foundational tables that other migrations depend on
-- Created: 2025-12-01
-- Purpose: Create users and accounts tables before other migrations that reference them

-- Enable UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (foundation for foreign key references)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('ADMIN', 'SALES_REP', 'MARKETING', 'SUPPORT', 'VIEWER')),
  title TEXT,
  department TEXT,
  
  -- External system mapping
  external_id TEXT, -- Salesforce/HubSpot user ID
  source_system TEXT,
  
  -- Preferences
  timezone TEXT DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{}',
  dashboard_preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(customer_id, email)
);

-- Accounts table (foundation for foreign key references)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  external_id TEXT, -- Salesforce/HubSpot Account ID
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  size_category TEXT CHECK (size_category IN ('SMB', 'MID-MARKET', 'ENTERPRISE')),
  arr DECIMAL(12,2) DEFAULT 0,
  health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
  lifecycle_stage TEXT CHECK (lifecycle_stage IN ('LEAD', 'MQL', 'SQL', 'ACTIVE', 'CHURNED', 'RENEWAL')),
  tier TEXT CHECK (tier IN ('FREE', 'GROWTH', 'PRO', 'ENTERPRISE')),
  billing_status TEXT CHECK (billing_status IN ('ACTIVE', 'CANCELED', 'PAST_DUE', 'TRIAL')),
  
  -- Ownership and relationships
  owner_id UUID REFERENCES users(id),
  parent_account_id UUID REFERENCES accounts(id),
  
  -- Address and contact info
  website TEXT,
  phone TEXT,
  description TEXT,
  
  -- Metadata
  source_system TEXT CHECK (source_system IN ('salesforce', 'hubspot', 'manual', 'csv_import')),
  sync_token TEXT, -- For incremental syncs
  raw_data JSONB, -- Original provider data
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Basic indexes for immediate use
CREATE INDEX IF NOT EXISTS idx_users_customer_id ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_customer_active ON users(customer_id, is_active);

CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_accounts_external_id ON accounts(external_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_accounts_lifecycle_stage ON accounts(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_accounts_health_score ON accounts(health_score);
CREATE INDEX IF NOT EXISTS idx_accounts_domain ON accounts(domain);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can view own customer data'
    ) THEN
        CREATE POLICY "Users can view own customer data" ON users FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'accounts' AND policyname = 'Users can manage own accounts'
    ) THEN
        CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));
    END IF;
END
$$;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'Core users table for RevOps platform with roles and preferences';
COMMENT ON TABLE accounts IS 'Core accounts table for company management with health tracking';
