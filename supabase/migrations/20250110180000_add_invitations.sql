-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invite details
  code TEXT UNIQUE NOT NULL,
  email TEXT, -- Optional: restrict to specific email
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  max_uses INTEGER DEFAULT 1, -- How many times this invite can be used
  uses_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by TEXT, -- Admin email who created it
  notes TEXT, -- Internal notes
  
  -- Tracking
  used_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invitations_code ON invitations(code);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_created_at ON invitations(created_at DESC);

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read pending invitations (needed for signup validation)
CREATE POLICY "Anyone can read pending invitations"
  ON invitations FOR SELECT
  USING (status = 'pending' AND (expires_at IS NULL OR expires_at > NOW()));

-- Only authenticated admins can insert/update (you'll need to create admin users)
-- For now, we'll use service role for this

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invitations_updated_at
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitations_updated_at();

-- Function to generate random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE invitations IS 'Invitation codes for controlled user signup';
