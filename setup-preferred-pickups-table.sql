-- Create preferred_pickups table for storing user's common pickup locations
CREATE TABLE IF NOT EXISTS preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- For now, can be a simple string identifier
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    kma_code TEXT,
    frequency_score INTEGER DEFAULT 1, -- How often this pickup is used
    equipment_preference TEXT[], -- Array of equipment codes this pickup is good for
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_user_active ON preferred_pickups(user_id, active);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_frequency ON preferred_pickups(frequency_score DESC);

-- Create RLS policy (if using Supabase RLS)
-- ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can manage their own preferred pickups" ON preferred_pickups
--     FOR ALL USING (auth.uid()::text = user_id);

-- Sample data for testing (using 'default_user' as user_id)
INSERT INTO preferred_pickups (user_id, city, state_or_province, zip, frequency_score, equipment_preference, notes) VALUES
('default_user', 'Maplesville', 'AL', '36750', 6, ARRAY['FD', 'V'], 'Common pickup location'),
('default_user', 'Seaboard', 'NC', '27876', 6, ARRAY['FD', 'V', 'R'], 'Frequent pickup area'),
('default_user', 'Atlanta', 'GA', '30309', 4, ARRAY['FD', 'V', 'R'], 'Major freight hub'),
('default_user', 'Charlotte', 'NC', '28202', 4, ARRAY['FD', 'V'], 'Distribution center'),
('default_user', 'Birmingham', 'AL', '35203', 3, ARRAY['FD'], 'Steel/manufacturing')
ON CONFLICT DO NOTHING;
