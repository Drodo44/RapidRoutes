-- Migration for reference number tracking system
CREATE TABLE IF NOT EXISTS reference_numbers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    number VARCHAR(7) NOT NULL UNIQUE CHECK (number ~ '^RR\d{5}$'),
    lane_id UUID REFERENCES lanes(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reference_numbers_number ON reference_numbers(number);
CREATE INDEX IF NOT EXISTS idx_reference_numbers_lane_id ON reference_numbers(lane_id);

-- Trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON reference_numbers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- RLS Policies
ALTER TABLE reference_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
    ON reference_numbers FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users"
    ON reference_numbers FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users"
    ON reference_numbers FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Function to get lane details by RR number
CREATE OR REPLACE FUNCTION get_lane_by_rr_number(rr_number TEXT)
RETURNS TABLE (
    lane_id UUID,
    origin_city TEXT,
    origin_state TEXT,
    dest_city TEXT,
    dest_state TEXT,
    equipment_code TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.origin_city,
        l.origin_state,
        l.dest_city,
        l.dest_state,
        l.equipment_code,
        rn.number as reference_id,
        l.created_at
    FROM reference_numbers rn
    JOIN lanes l ON l.id = rn.lane_id
    WHERE rn.number = rr_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
