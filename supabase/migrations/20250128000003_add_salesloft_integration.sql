-- Add Salesloft integration support
-- Migration for Salesloft connection settings

-- Add Salesloft connection fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS salesloft_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS salesloft_token TEXT,
ADD COLUMN IF NOT EXISTS salesloft_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS salesloft_instance_url TEXT,
ADD COLUMN IF NOT EXISTS salesloft_last_sync TIMESTAMP WITH TIME ZONE;
