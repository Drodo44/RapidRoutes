# 🗄️ Database Migration Guide - City Performance Table

**Status:** ⚠️ **REQUIRED BEFORE MONDAY DEMO**  
**Time Required:** 2-3 minutes  
**Complexity:** Simple (Copy/Paste SQL)

---

## ⚠️ Why This Migration is Needed

The **city_performance** table is required for RapidRoutes 2.0's Smart City Learning feature. Without it:
- ❌ Coverage tracking won't work
- ❌ City starring feature unavailable
- ❌ `/api/city-performance` returns 500 error
- ❌ 1 of 10 production tests fails (90% instead of 100%)

**After migration:**
- ✅ Smart City Learning fully functional
- ✅ 10/10 tests passing (100% success rate)
- ✅ All RapidRoutes 2.0 features operational

---

## 🚀 Quick Start (Recommended Method)

### Step 1: Open Supabase Dashboard
Navigate to: **https://supabase.com/dashboard**

### Step 2: Select Your Project
Find and click on your **RapidRoutes** project

### Step 3: Open SQL Editor
Click **"SQL Editor"** in the left sidebar

### Step 4: Create New Query
Click **"New Query"** button (top right)

### Step 5: Copy SQL
Open the file: `sql/create-city-performance.sql`

Or copy from here:

```sql
-- Create city_performance table for Smart City Learning
-- Tracks which cities successfully cover loads via IBC/OBC/Email

CREATE TABLE IF NOT EXISTS city_performance (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  kma TEXT,
  covers_total INT DEFAULT 0,
  covers_ibc INT DEFAULT 0,
  covers_obc INT DEFAULT 0,
  covers_email INT DEFAULT 0,
  last_success TIMESTAMP DEFAULT NOW(),
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(city, state)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_city_performance_starred ON city_performance(is_starred);
CREATE INDEX IF NOT EXISTS idx_city_performance_city_state ON city_performance(city, state);

-- RLS Policies (enable for authenticated users)
ALTER TABLE city_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read city_performance"
  ON city_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert city_performance"
  ON city_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update city_performance"
  ON city_performance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add coverage fields to lanes table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='coverage_source'
  ) THEN
    ALTER TABLE lanes ADD COLUMN coverage_source TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='lane_group_id'
  ) THEN
    ALTER TABLE lanes ADD COLUMN lane_group_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='rr_number'
  ) THEN
    ALTER TABLE lanes ADD COLUMN rr_number TEXT;
  END IF;
END $$;

-- Create index on rr_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_lanes_rr_number ON lanes(rr_number);
CREATE INDEX IF NOT EXISTS idx_lanes_lane_group_id ON lanes(lane_group_id);
CREATE INDEX IF NOT EXISTS idx_lanes_coverage_source ON lanes(coverage_source);

COMMENT ON TABLE city_performance IS 'Tracks city coverage success metrics for Smart City Learning';
COMMENT ON COLUMN city_performance.is_starred IS 'Auto-starred when covers_ibc >= 5 OR covers_total >= 10';
```

### Step 6: Execute SQL
Click **"Run"** button or press `Cmd+Enter` (Mac) / `Ctrl+Enter` (Windows)

### Step 7: Verify Success
You should see: **"Success. No rows returned"** or similar

---

## ✅ Verification Steps

After running the migration, verify it worked:

### 1. Run Production Tests
```bash
npm run check:prod
```

**Expected Output:**
```
✅ City Performance API - Starred cities: 0
```

**Success Rate:** 10/10 tests passing (100%)

### 2. Check Table Exists
In Supabase Dashboard:
1. Go to "Table Editor"
2. Look for `city_performance` table
3. Should show 0 rows (empty but created)

### 3. Check Lanes Columns
In Supabase Dashboard:
1. Go to "Table Editor"
2. Click `lanes` table
3. Verify new columns exist:
   - `coverage_source`
   - `lane_group_id`
   - `rr_number`

---

## 📊 What This Migration Does

### Creates city_performance Table
```
Schema:
  - id (Primary Key)
  - city, state (Unique together)
  - kma (Key Market Area code)
  - covers_total, covers_ibc, covers_obc, covers_email (Counters)
  - last_success (Timestamp of last coverage)
  - is_starred (Boolean for high performers)
  - created_at, updated_at (Timestamps)

Purpose:
  Track which cities successfully cover loads and via what method
```

### Updates lanes Table
```
New Columns:
  - coverage_source: TEXT (IBC/OBC/Email)
  - lane_group_id: TEXT (for grouping related lanes)
  - rr_number: TEXT (RapidRoutes reference ID like "RR1", "RR2")

Purpose:
  Enable lane tracking, grouping, and search by RR#
```

### Creates Indexes
```
Performance Optimizations:
  - idx_city_performance_starred (fast starred city lookups)
  - idx_city_performance_city_state (fast city searches)
  - idx_lanes_rr_number (instant RR# search)
  - idx_lanes_lane_group_id (quick group filtering)
  - idx_lanes_coverage_source (coverage type queries)
```

### Enables RLS Policies
```
Security:
  - Authenticated users can SELECT/INSERT/UPDATE city_performance
  - Protects data from unauthorized access
  - Maintains data integrity
```

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Solution:** Table already created! This is fine. Continue to verification.

### Error: "column already exists"
**Solution:** Columns already added! This is fine. Continue to verification.

### Error: "permission denied"
**Solution:** 
1. Make sure you're logged into correct Supabase project
2. Check you have admin/owner role
3. Try using Service Role instead of anon key

### Error: "RLS policy already exists"
**Solution:** Policies already created! This is fine. Continue to verification.

### Tests Still Failing After Migration
**Check:**
1. Did SQL execute without errors?
2. Does `city_performance` table exist in Table Editor?
3. Are RLS policies enabled?
4. Run: `npm run check:prod` again (may need 30s for cache)

---

## 🔄 Alternative Methods

### Method 1: Local psql (If Available)
```bash
psql $DATABASE_URL < sql/create-city-performance.sql
```

### Method 2: Supabase CLI (If Installed)
```bash
supabase db push
```

### Method 3: Direct API Call (Advanced)
```bash
curl -X POST 'YOUR_SUPABASE_URL/rest/v1/rpc/exec_sql' \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sql_query": "<entire SQL here>"}'
```

---

## 📝 Migration Checklist

Before Monday presentation:
- [ ] SQL executed in Supabase Dashboard
- [ ] Success message received
- [ ] `city_performance` table visible in Table Editor
- [ ] `lanes` table has new columns (coverage_source, lane_group_id, rr_number)
- [ ] Run `npm run check:prod` shows 10/10 passing
- [ ] City Performance API returns 200 OK (not 500)

---

## 🎯 Impact on Features

Once migrated, these features become functional:

### Smart City Learning ✅
- Track which cities cover loads
- Separate IBC/OBC/Email metrics
- Auto-star high performers

### Coverage Modal ✅
- "📞 IBC – Inbound Call" option
- "📤 OBC – Outbound Call" option
- "✉️ Email – Inbound Email" option

### Starred Cities ✅
- Cities auto-starred at ≥5 IBCs OR ≥10 total covers
- ⭐ indicator in UI
- Future: Prioritize starred cities in lane generation

### RR# Search ✅
- Search lanes by "RR1", "RR2", etc.
- Dropdown navigation
- Persistent highlight

---

## 📚 Related Documentation

- **Technical:** RAPIDROUTES_2_0_DEPLOYMENT.md (Implementation details)
- **User Guide:** QUICK_START_GUIDE.md (How to use features)
- **Testing:** Run `npm run check:prod` after migration

---

## ⏱️ Timeline

**Estimated Time:** 2-3 minutes total
- Open Supabase Dashboard: 30 seconds
- Copy/paste SQL: 30 seconds
- Execute: 10 seconds
- Verify: 1-2 minutes

**When to Do:** Before Monday presentation (HIGH priority)

---

## ✅ Success Confirmation

You'll know the migration worked when:

1. **Supabase Dashboard shows:** "Success. No rows returned"
2. **Table Editor shows:** `city_performance` table exists
3. **Production tests show:** 10/10 passing (100%)
4. **API returns:** `{"success":true,"data":[]}`

Run verification:
```bash
npm run check:prod
```

Expected last line:
```
✅ ALL TESTS PASSED - PRODUCTION READY! ✅
```

---

**🚀 Ready to migrate? Open Supabase Dashboard and copy/paste the SQL!**

*Need help? Check PRESENTATION_PREP.md for troubleshooting or contact support.*
