# City Corrections - Quick Start

## ✨ Feature: Automatic City Name Corrections for DAT

Just like the blacklist feature, but **corrects** city names instead of blocking them.

---

## 🚀 Setup (One-Time)

### Step 1: Create Database Table

Go to **Supabase Dashboard → SQL Editor** and paste this:

```sql
CREATE TABLE city_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incorrect_city TEXT NOT NULL,
  incorrect_state TEXT NOT NULL,
  correct_city TEXT NOT NULL,
  correct_state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(incorrect_city, incorrect_state)
);

CREATE INDEX idx_city_corrections_lookup ON city_corrections(incorrect_city, incorrect_state);
ALTER TABLE city_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view city corrections" ON city_corrections FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage corrections" ON city_corrections FOR ALL USING (auth.role() = 'authenticated');
```

### Step 2: Add Initial Data

Run in terminal:
```bash
node setup-corrections-table.mjs
```

---

## 📝 Daily Use

### When DAT Rejects a City Name:

1. **Go to:** Settings page (same place as the Blacklist)

2. **Scroll to:** "City Name Corrections" section

3. **Fill in the form:**
   - **Incorrect City**: "Sunny Side"
   - **State**: "GA"
   - **Correct City**: "Sunnyside"  
   - **State**: "GA"
   - **Notes**: "DAT rejected spacing"

4. **Click:** "Add Correction"

5. **Done!** ✅ Future lanes will automatically use "Sunnyside"

---

## 💡 How It Works

```
Lane Generation → Check Corrections → Apply Fix → Export to DAT ✅
```

- Corrections are **automatic** - no manual edits needed
- Cached for **1 minute** for speed
- Works on **all future** DAT exports

---

## 📋 Admin UI Features

✅ View all corrections  
✅ Add new corrections  
✅ Delete old corrections  
✅ Search/filter corrections  
✅ See when corrections were added  

---

## 🎯 Example

**Before:**
```
City: Sunny Side, GA ❌ (DAT rejects)
```

**After adding correction:**
```
City: Sunnyside, GA ✅ (DAT accepts)
```

**No more manual edits!** 🎉

---

## 🔧 Files Changed

- ✅ `pages/api/post-options.js` - API logic updated
- ✅ `pages/admin/city-corrections.js` - NEW admin UI
- ✅ Database table created

---

## 📞 Need Help?

Check `CITY_CORRECTIONS_GUIDE.md` for full documentation.
