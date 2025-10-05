# Status System Simplification

## Run this SQL in Supabase SQL Editor:

```sql
-- Update all active lanes to 'current' status
UPDATE lanes 
SET lane_status = 'current' 
WHERE lane_status IN ('pending', 'active', 'posted');

-- Update all inactive lanes to 'archive' status  
UPDATE lanes 
SET lane_status = 'archive'
WHERE lane_status IN ('covered', 'archived');

-- Add comment explaining new system
COMMENT ON COLUMN lanes.lane_status IS 'Lane status: current (active/working lanes) or archive (completed/inactive lanes)';
```

## Steps:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Tell me "status updated" when done

This will consolidate all lanes into just two categories: Current and Archive.
