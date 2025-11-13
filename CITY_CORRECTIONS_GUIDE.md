# City Name Corrections Feature

## Overview
Automatic correction system for city names that DAT rejects. Works like the blacklist feature but corrects city names instead of blocking them.

## How It Works

1. **Database-Driven**: Corrections are stored in the `city_corrections` table
2. **Automatic Application**: Corrections are applied automatically during city generation
3. **Cached for Performance**: Corrections are cached for 1 minute to avoid repeated database queries
4. **Legacy Fallback**: Hardcoded corrections in the API code as backup

## Setup Instructions

### Step 1: Create the Database Table

Go to your **Supabase Dashboard → SQL Editor** and run this SQL:

```sql
CREATE TABLE IF NOT EXISTS city_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incorrect_city TEXT NOT NULL,
  incorrect_state TEXT NOT NULL,
  correct_city TEXT NOT NULL,
  correct_state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(incorrect_city, incorrect_state)
);

CREATE INDEX IF NOT EXISTS idx_city_corrections_lookup 
ON city_corrections(incorrect_city, incorrect_state);

ALTER TABLE city_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view city corrections" 
ON city_corrections FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage corrections" 
ON city_corrections FOR ALL 
USING (auth.role() = 'authenticated');
```

### Step 2: Add Initial Data

After creating the table, run:
```bash
node setup-corrections-table.mjs
```

This will add the initial correction: **"Sunny Side, GA" → "Sunnyside, GA"**

### Step 3: Access the Corrections UI

Navigate to: **Settings page** (same page as the City Blacklist)

Scroll down to the **"City Name Corrections"** section.

## Using the Corrections UI

### Adding a Correction

1. Go to the **Settings** page (same page where you manage the City Blacklist)
2. Scroll down to **"City Name Corrections"** section
3. Fill in the form with:
   - **Incorrect City Name**: The city name as it appears in your database (e.g., "Sunny Side")
   - **State**: 2-letter state code (e.g., "GA")
   - **Correct City Name**: The DAT-accepted spelling (e.g., "Sunnyside")
   - **Correct State**: Usually the same, but can be different if needed
   - **Notes**: Optional explanation (e.g., "DAT rejected with spacing error")

2. Click **"Add Correction"**

3. The correction is immediately active and will be applied to all future DAT exports

### Managing Corrections

- **View All**: The table shows all active corrections
- **Delete**: Click "Delete" next to any correction to remove it
- **Search**: Use your browser's search (Ctrl+F) to find specific corrections

## How Corrections Are Applied

When generating city options for a lane:

1. System queries the database for cities
2. Before displaying cities, it checks for corrections
3. If "Sunny Side, GA" is found, it's automatically changed to "Sunnyside, GA"
4. The corrected name is used in the DAT CSV export
5. DAT accepts the corrected name ✅

## Example Workflow

**Scenario**: DAT rejects "Sunny Side, GA" but suggests "Sunnyside, GA"

1. Go to Settings page
2. Scroll to "City Name Corrections" section
3. Add correction:
   - Incorrect: "Sunny Side" / "GA"
   - Correct: "Sunnyside" / "GA"
   - Notes: "DAT rejected with spacing error"
3. Click "Add Correction"
4. Next time you post a lane with Sunnyside, GA, it will automatically use the correct spelling
5. No more manual edits needed! 🎉

## Technical Details

### API Implementation
- Location: `pages/api/post-options.js`
- Function: `correctCityName(city, state, dbCorrections)`
- Cache: 1-minute TTL (refreshes every 60 seconds)

### Database Schema
```
city_corrections (
  id UUID PRIMARY KEY,
  incorrect_city TEXT NOT NULL,
  incorrect_state TEXT NOT NULL,
  correct_city TEXT NOT NULL,
  correct_state TEXT NOT NULL,
  created_at TIMESTAMP,
  notes TEXT,
  UNIQUE(incorrect_city, incorrect_state)
)
```

### Legacy Hardcoded Corrections
The system also includes these hardcoded corrections as fallback:
- Redwood, OR → Redmond, OR
- Bellwood, VA → Elkwood, VA
- Dasher, GA → Jasper, GA
- Ensley, FL → Ensley, AL
- Sunny Side, GA → Sunnyside, GA

## Benefits

✅ **Saves Time**: No manual city name edits in DAT uploads  
✅ **Prevents Errors**: Automatic corrections ensure consistency  
✅ **Easy to Manage**: Simple UI for adding/removing corrections  
✅ **No Code Changes**: Add corrections without touching code  
✅ **Performance**: Cached for fast lookups  

## Troubleshooting

**Q: Correction not working?**
- Check the spelling matches exactly (case-insensitive)
- Wait 60 seconds for cache to refresh
- Check the correction exists in the database

**Q: Can I correct to a different state?**
- Yes! The correct_state can be different from incorrect_state

**Q: What if I delete a correction by mistake?**
- Just add it again - there's no data loss

## Future Enhancements

Possible additions:
- Bulk import corrections from CSV
- Export corrections list
- Correction history/audit log
- Automatic detection of DAT rejections
- Suggested corrections based on similar city names
