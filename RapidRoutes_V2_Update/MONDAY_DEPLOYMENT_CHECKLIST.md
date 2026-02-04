# Quick Deployment Checklist - Monday Oct 15, 2025

## Pre-Deployment (5 minutes)

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Build production
npm run build

# 4. Start production server
npm run start
```

## Verification (2 minutes)

```bash
# Test API responds
curl -sS -H "x-rapidroutes-test: b24505dd5090ada3828394d881636f64" \
  "http://localhost:3000/api/lanes?limit=1" | jq '.[0].origin_city'

# Expected output: "Bradenton" (or other city name)
```

## If Issues Occur

1. **Check environment variables:**
   ```bash
   grep SUPABASE .env.local
   ```
   Should show `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

2. **Check logs:**
   ```bash
   tail -f /tmp/production.log
   ```

3. **Restart server:**
   ```bash
   pkill -f "next start"
   npm run start > /tmp/production.log 2>&1 &
   ```

## Success Indicators

✅ Build completes without errors  
✅ Server starts on port 3000  
✅ API returns data with non-null `origin_city`  
✅ Logs show "getLanes returned X rows"  

## Emergency Rollback

If critical issues arise:
```bash
# Stop server
pkill -f "next start"

# Restore TypeScript version (if needed)
mv services/laneService.ts.backup services/laneService.ts
rm services/laneService.js

# Rebuild and restart
npm run build && npm run start
```
Note: This will restore the null value bug. Only use as last resort.

---

**Current Status: READY TO DEPLOY** ✅
