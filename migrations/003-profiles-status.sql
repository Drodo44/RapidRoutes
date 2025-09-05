-- migrations/003-profiles-status.sql

-- Add status field to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'approved', 'rejected'));
