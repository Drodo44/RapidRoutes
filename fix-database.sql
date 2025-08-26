-- Create missing database tables
CREATE TABLE IF NOT EXISTS user_prefs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    show_rrsi BOOLEAN DEFAULT false,
    default_weight_min INTEGER,
    default_weight_max INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    kma_code TEXT,
    kma_name TEXT,
    frequency_score INTEGER DEFAULT 1,
    equipment_preference TEXT[],
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own prefs" ON user_prefs
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    
CREATE POLICY "Users can manage their own pickups" ON preferred_pickups
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
