-- Add Gong integration support
-- Migration for Gong call analysis and activities

-- Add Gong connection fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS gong_connected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS gong_token TEXT,
ADD COLUMN IF NOT EXISTS gong_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gong_last_sync TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gong_instance_url TEXT;
