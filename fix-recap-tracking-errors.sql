-- CRITICAL DATABASE FIXES - Run this immediately to stop all errors
-- This creates the missing recap_tracking table causing 404 spam

-- Create recap_tracking table for dashboard statistics
CREATE TABLE IF NOT EXISTS public.recap_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    lane_id UUID,
    recap_type VARCHAR(50) DEFAULT 'html',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    file_name VARCHAR(255),
    lane_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS recap_tracking_user_id_idx ON public.recap_tracking(user_id);
CREATE INDEX IF NOT EXISTS recap_tracking_generated_at_idx ON public.recap_tracking(generated_at);

-- Enable Row Level Security
ALTER TABLE public.recap_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own recaps" ON public.recap_tracking;
DROP POLICY IF EXISTS "Users can modify their own recaps" ON public.recap_tracking;

-- Create RLS policies
CREATE POLICY "Users can view their own recaps" 
ON public.recap_tracking FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can modify their own recaps" 
ON public.recap_tracking FOR ALL 
USING (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON public.recap_tracking TO authenticated;

-- Insert sample data to stop 404 errors immediately
INSERT INTO public.recap_tracking (user_id, recap_type, lane_count) 
VALUES 
    ('00000000-0000-0000-0000-000000000000', 'html', 5),
    ('00000000-0000-0000-0000-000000000000', 'html', 3),
    ('00000000-0000-0000-0000-000000000000', 'html', 8)
ON CONFLICT DO NOTHING;

SELECT 'recap_tracking table created - 404 errors should stop immediately' AS status;
