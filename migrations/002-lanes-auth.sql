-- migrations/002-lanes-auth.sql

-- Add created_by column to lanes table
ALTER TABLE lanes
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Enable RLS on lanes table
ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read lanes
CREATE POLICY "Everyone can read lanes"
    ON lanes FOR SELECT
    USING (true);

-- Policy: Users can create their own lanes
CREATE POLICY "Users can create their own lanes"
    ON lanes FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own lanes
CREATE POLICY "Users can update their own lanes"
    ON lanes FOR UPDATE
    USING (
        auth.uid() = created_by
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Policy: Users can delete their own lanes
CREATE POLICY "Users can delete their own lanes"
    ON lanes FOR DELETE
    USING (
        auth.uid() = created_by
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Backfill created_by if needed (run this carefully in production)
UPDATE lanes 
SET created_by = (
    SELECT id 
    FROM auth.users 
    WHERE role = 'authenticated'
    ORDER BY created_at ASC 
    LIMIT 1
)
WHERE created_by IS NULL;
