# Database Migration Required

## Run this SQL in Supabase SQL Editor:

```sql
-- Add columns for storing user-selected city pairs
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS saved_origin_cities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS saved_dest_cities JSONB DEFAULT '[]';

-- Add helpful comments
COMMENT ON COLUMN lanes.saved_origin_cities IS 'Array of origin cities user selected for posting';
COMMENT ON COLUMN lanes.saved_dest_cities IS 'Array of destination cities user selected for posting';
```

## Steps:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Verify success message
5. Come back and confirm columns added

Once you confirm, I'll proceed with the remaining fixes.
