-- Step 4: Team Management Features
-- Add team_name column and create promotion_requests table

-- Add team_name to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS team_name TEXT;

-- Create promotion_requests table
CREATE TABLE IF NOT EXISTS promotion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  current_role TEXT NOT NULL,
  current_organization_id UUID,
  requested_team_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_promotion_requests_user_id ON promotion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_requests_status ON promotion_requests(status);

-- Set initial team name for existing broker
UPDATE profiles 
SET team_name = 'Connellan Logistics'
WHERE id = '389fa9a8-50e8-401f-a896-c9004ec99356';
