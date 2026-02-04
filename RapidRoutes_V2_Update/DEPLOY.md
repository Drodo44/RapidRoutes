# 🚀 RapidRoutes Deployment Guide

## Quick Deploy (Monday Launch)

### Step 1: Final Verification
```bash
# Run production build
npm run build

# Test production server locally
npm run start

# Verify API endpoint
curl "http://localhost:3000/api/lanes?limit=5"
```

### Step 2: Deploy to Vercel
```bash
# Push to main branch (auto-deploys via GitHub integration)
git add .
git commit -m "Production launch: KMA enrichment complete, all APIs stable"
git push origin main
```

**Vercel will automatically:**
1. Detect the push to `main`
2. Run `npm run build`
3. Deploy to production domain
4. Run health checks

### Step 3: Post-Deployment Verification
```bash
# Replace YOUR_DOMAIN with actual Vercel domain
curl "https://YOUR_DOMAIN.vercel.app/api/lanes?limit=5"

# Expected: JSON array with KMA codes
# Origin_kma_code and destination_kma_code should be populated
```

---

## Environment Variables (Already Configured in Vercel)

✅ `NEXT_PUBLIC_SUPABASE_URL`  
✅ `SUPABASE_SERVICE_ROLE_KEY`  
✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`

*No changes needed - already set in Vercel dashboard*

---

## Rollback (If Needed)

### Via Vercel Dashboard
1. Go to vercel.com/dashboard
2. Select RapidRoutes project
3. Click "Deployments"
4. Find previous stable deployment
5. Click "..." → "Promote to Production"

### Via Git
```bash
# Revert to previous commit
git log --oneline  # Find previous commit hash
git revert <commit-hash>
git push origin main
```

---

## Health Check Endpoints

After deployment, verify these URLs:

1. **API Status:** `/api/lanes?limit=1`
   - Should return 1 record with KMA codes

2. **Dashboard:** `/dashboard`
   - Should display live statistics

3. **Authentication:** `/login`
   - Should load Supabase auth form

---

## Production Monitoring

### Vercel Dashboard
- **Functions:** Monitor API response times
- **Logs:** Real-time error tracking
- **Analytics:** Page views and performance

### Supabase Dashboard
- **Database:** Query performance and connection pool
- **Auth:** User login activity
- **Storage:** DAT image uploads

---

## Support Contacts

- **Vercel Issues:** support@vercel.com
- **Supabase Issues:** support@supabase.io
- **Code Repository:** github.com/Drodo44/RapidRoutes

---

## Success Criteria

✅ All API endpoints return data with KMA codes  
✅ Dashboard loads without errors  
✅ Users can authenticate successfully  
✅ DAT CSV exports work end-to-end  

**Status:** READY FOR LAUNCH 🚀
