-- Create missing database tables for profile functionality
-- This fixes 404 errors when accessing /api/preferred-pickups

-- Create user_prefs table for user preferences
CREATE TABLE IF NOT EXISTS public.user_prefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    preferences JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create preferred_pickups table for user's preferred pickup locations
CREATE TABLE IF NOT EXISTS public.preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_or_province VARCHAR(10) NOT NULL,
    zip VARCHAR(20),
    frequency_score INTEGER DEFAULT 1,
    equipment_preference TEXT[],
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS user_prefs_user_id_idx ON public.user_prefs(user_id);
CREATE INDEX IF NOT EXISTS preferred_pickups_user_id_idx ON public.preferred_pickups(user_id);
CREATE INDEX IF NOT EXISTS preferred_pickups_active_idx ON public.preferred_pickups(active);

-- Enable Row Level Security
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferred_pickups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_prefs;
DROP POLICY IF EXISTS "Users can modify their own preferences" ON public.user_prefs;
DROP POLICY IF EXISTS "Users can view their own preferred pickups" ON public.preferred_pickups;
DROP POLICY IF EXISTS "Users can modify their own preferred pickups" ON public.preferred_pickups;

-- Create RLS policies for user_prefs
CREATE POLICY "Users can view their own preferences" 
ON public.user_prefs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify their own preferences" 
ON public.user_prefs FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for preferred_pickups
CREATE POLICY "Users can view their own preferred pickups" 
ON public.preferred_pickups FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can modify their own preferred pickups" 
ON public.preferred_pickups FOR ALL 
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_prefs TO authenticated;
GRANT ALL ON public.preferred_pickups TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Success message
SELECT 'Database tables created successfully! Profile functionality should now work.' AS status;
