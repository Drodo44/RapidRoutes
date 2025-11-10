# Delivery City Options Fix - Summary

## Issue
The delivery side of lane generation was incorrectly filtering out valid destination cities for New England (MA, NH, ME, VT, RI, CT) destination lanes. Specifically, upstate New York cities (Albany, Buffalo, Syracuse, etc.) were being removed from the available options.

## Root Cause
The `pages/api/post-options.js` file contained duplicate New England filtering logic:

1. **First filter (lines 304-334)**: Applied BEFORE `balanceByKMA`
   - Blocked NYC/Long Island KMAs (NY_BRN, NY_BKN, NY_NYC, etc.)
   - Kept New England states AND upstate NY cities
   - This was CORRECT behavior

2. **Second filter (lines 342-366)**: Applied AFTER `balanceByKMA`
   - Removed ALL cities that weren't in New England states
   - This included valid upstate NY cities
   - This was INCORRECT and conflicted with the first filter

## Solution
Removed the duplicate second filter, keeping only the correct first filter that:
- Blocks NYC/Long Island KMAs specifically (to prevent Brooklyn/LI from dominating MA/NH/ME destination lists)
- Allows upstate NY cities (Albany, Buffalo, Syracuse, etc.)
- Allows all New England state cities (MA, NH, ME, VT, RI, CT)
- Blocks other states (PA, NJ, etc.)

## Changes Made

### File: `pages/api/post-options.js`
- **Lines removed**: 341-366 (duplicate filter and associated logging)
- **Lines changed**: 337 - Changed `let balancedDest` to `const balancedDest`
- **Net result**: 29 lines removed, cleaner and correct logic

### File: `tests/post-options-fix.test.js` (new)
- Created comprehensive unit tests to verify the fix
- 5 test cases covering all filtering scenarios
- All tests pass ✅

## Verification

### Build Status
✅ `npm run build` completes successfully with no errors

### Test Status
✅ All 5 unit tests pass:
1. NYC/Long Island KMAs are blocked for New England destinations
2. Upstate NY cities are allowed for New England destinations
3. All New England state cities are allowed
4. Non-New England, non-NY cities are blocked
5. Mixed cities are filtered correctly

### Linting Status
✅ ESLint passes with no errors

### Security Status
✅ CodeQL security scan passes with no issues

## Impact

### Before Fix
- For a New England destination lane (e.g., Boston, MA):
  - NYC/LI cities: ❌ Blocked (correct)
  - Upstate NY cities: ❌ Blocked (INCORRECT - this was the bug)
  - New England cities: ✅ Included (correct)
  - Other state cities: ❌ Blocked (correct)

### After Fix
- For a New England destination lane (e.g., Boston, MA):
  - NYC/LI cities: ❌ Blocked (correct)
  - Upstate NY cities: ✅ Included (correct)
  - New England cities: ✅ Included (correct)
  - Other state cities: ❌ Blocked (correct)

## Technical Details

### The Correct Filter Logic
```javascript
if (isNewEnglandLane && destOptions.length > 0) {
  destOptions = destOptions.filter(c => {
    const cState = normalizeStateName(c.state_or_province || '');
    
    // Block NYC/Long Island KMAs explicitly
    if (NYC_LI_KMA_BLOCKLIST.has(c.kma_code)) {
      return false;
    }
    
    // Keep New England states + NY (upstate will remain after KMA filter)
    return NEW_ENGLAND.has(cState) || cState === 'NY';
  });
}
```

### NYC/LI KMAs Blocked
- NY_BRN (Brooklyn)
- NY_BKN (Brooklyn alt)
- NY_NYC (Manhattan)
- NY_QUE (Queens)
- NY_BRX (Bronx)
- NY_STA (Staten Island)
- NY_NAS (Nassau)
- NY_SUF (Suffolk)

### New England States
- MA (Massachusetts)
- NH (New Hampshire)
- ME (Maine)
- VT (Vermont)
- RI (Rhode Island)
- CT (Connecticut)

## No Breaking Changes

This fix:
- ✅ Does not affect non-New England lanes
- ✅ Does not change the API interface
- ✅ Does not require database changes
- ✅ Does not require environment variable changes
- ✅ Is backward compatible with existing lane data
- ✅ Maintains all existing business rules except fixing the bug

## Deployment

No special deployment steps required. The fix:
- Is purely code-based
- Requires only a standard deployment
- Will take effect immediately for new lane option generation
- Does not affect existing lane data in the database
