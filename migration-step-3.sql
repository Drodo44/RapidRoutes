-- Step 3: Enable RLS and create policy
ALTER TABLE posted_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own posted pairs" ON posted_pairs
    FOR ALL USING (created_by = auth.uid());
