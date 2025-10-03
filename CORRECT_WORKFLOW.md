# RapidRoutes Correct Workflow (FIXED)

## The Simple 3-Step Process

### Step 1: Enter Lane Details
**Location**: Lanes page → "Post Options" button

1. Fill in origin/destination cities (base lane)
2. Enter equipment, weight, dates
3. Click "Post Options" to select city variations

### Step 2: Select City Variations
**Location**: Post Options (Manual) page

1. You'll see your base lane at the top
2. Check the **pickup cities** you want (with KMAs and miles shown)
3. Check the **delivery cities** you want (with KMAs and miles shown)
4. Click "Save City Choices"
5. Lane status changes from **PENDING** → **ACTIVE**

**What you select**: If you pick 5 pickup cities and 13 delivery cities, the system will generate 65 posting combinations (5×13=65)

### Step 3: View Your Selections
**Location**: Recap page

**What you'll see**:
- Your lane info (equipment, weight, dates, reference ID)
- **TWO COLUMNS**:
  - **LEFT**: Your selected PICKUP cities (with KMAs/miles)
  - **RIGHT**: Your selected DELIVERY cities (with KMAs/miles)  
- Total count: e.g., "(5 pickup × 13 delivery = 65 total pairs)"

**NOT what you'll see anymore**:
- ❌ NO MORE 65 individual pair cards
- ❌ NO MORE overwhelming list of every combination
- ❌ NO MORE confusion about "what did I choose?"

### Step 4: Mark as Posted (When Ready)
**Location**: Lanes page → Current tab

1. Click "✅ Mark Posted" button
2. Lane moves to POSTED status badge
3. Recap page still shows your selected cities (same grouped view)
4. Generate CSV to upload to DAT

---

## What the Fix Changed

### BEFORE (Broken):
```
You select: 5 pickup cities, 13 delivery cities
Recap shows: 65 separate cards with every possible combination
Mark Posted: Crashes with 500 errors
Result: Overwhelming, confusing, broken
```

### AFTER (Fixed):
```
You select: 5 pickup cities, 13 delivery cities
Recap shows: 
  ┌─────────────────┬──────────────────┐
  │ PICKUP CITIES   │ DELIVERY CITIES  │
  ├─────────────────┼──────────────────┤
  │ • City 1 (KMA)  │ • City 1 (KMA)   │
  │ • City 2 (KMA)  │ • City 2 (KMA)   │
  │ • City 3 (KMA)  │ • City 3 (KMA)   │
  │ • City 4 (KMA)  │ ... (13 total)   │
  │ • City 5 (KMA)  │                  │
  └─────────────────┴──────────────────┘
  (5 pickup × 13 delivery = 65 total pairs)

Mark Posted: Still shows grouped view
Result: Clear, fast, professional
```

---

## Status Flow

```
PENDING → Select cities → ACTIVE → Mark Posted → POSTED → Generate CSV
   ↓                        ↓                      ↓
No cities saved    Recap shows      Recap shows      CSV downloads
                   your selections  your selections  with all pairs
```

---

## Recap Page View (Current State)

### For ACTIVE Lanes:
- ✅ Your Selected Cities
- Two-column layout: Pickup | Delivery
- KMA codes and miles shown
- Total pair count displayed

### For POSTED Lanes:
- ✅ Your Selected Cities (same view)
- **PLUS**: Green badge "✅ These city combinations have been posted to DAT"
- Still shows grouped lists, NOT all combinations

---

## Next Steps (CSV Generation)

1. When ready to post to DAT, click "Generate CSV" button on Lanes page
2. System generates all combinations from your saved cities
3. Downloads CSV file with all pairs ready for DAT upload
4. Each pair gets unique reference ID (RR#####-0, RR#####-1, etc.)

---

## What Gets Saved to Database

**Table**: `lane_city_choices`
**Columns**:
- `lane_id`: The lane this belongs to
- `origin_chosen_cities`: JSONB array of your selected pickup cities
  ```json
  [
    {city: "Atlanta", state: "GA", kma_code: "ATL", miles: 15},
    {city: "Marietta", state: "GA", kma_code: "ATL", miles: 22},
    ...
  ]
  ```
- `dest_chosen_cities`: JSONB array of your selected delivery cities
  ```json
  [
    {city: "Chicago", state: "IL", kma_code: "CHI", miles: 8},
    {city: "Naperville", state: "IL", kma_code: "CHI", miles: 18},
    ...
  ]
  ```

**The key difference**: We store arrays of your selections, not pre-computed pairs. Pairs are generated on-demand for CSV export.

---

## Troubleshooting

### "I don't see my saved lanes in Recap"
- Check the Lanes page **Current** tab
- Status should show **ACTIVE** (green badge)
- If you just saved, refresh the recap page

### "Recap still shows all 65 combinations"
- You're on the old version - this is now fixed
- Refresh your browser (Ctrl+Shift+R to bypass cache)
- Should see grouped two-column view

### "I marked Posted but recap is empty"
- This was the 500 error bug - now fixed
- Refresh the page after marking posted
- Should see your grouped city selections with green "posted" badge

### "I want to change my city selections"
- Go back to Post Options page
- Re-select cities
- Click "Save City Choices" again
- Latest save overwrites previous selection

---

## The Math

If you select:
- 5 pickup cities
- 13 delivery cities

**Total posting pairs** = 5 × 13 = **65 pairs**

Each pair gets posted to DAT as a separate load with:
- Unique reference ID (RR#####-0, RR#####-1, etc.)
- Specific pickup city from your 5 selections
- Specific delivery city from your 13 selections
- Same equipment, weight, dates for all pairs

This is correct! DAT will show 65 individual postings to maximize your lane coverage.
