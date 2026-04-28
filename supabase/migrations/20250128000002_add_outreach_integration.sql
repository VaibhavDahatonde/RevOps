-- Add Outreach integration support
-- Migration for Outreach connection settings

-- Add Outreach connection fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS outreach_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS outreach_token TEXT,
ADD COLUMN IF NOT EXISTS outreach_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS outreach_instance_url TEXT,
ADD COLUMN IF NOT EXISTS outreach_last_sync TIMESTAMP WITH TIME ZONE;
