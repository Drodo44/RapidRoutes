# RapidRoutes API Fix & Verification Guide

This guide provides step-by-step instructions for fixing and verifying the intelligence-pairing API endpoint in RapidRoutes. The API was returning 500 Internal Server Error responses due to missing RPC functions.

## 🔍 Issue Summary

The intelligence-pairing API was returning `500 Internal Server Error` responses when:

1. The database RPC function `find_cities_within_radius` was missing or improperly implemented
2. Error handling was insufficient for missing parameters or database errors

## 🛠️ Quick Fix Steps

### Option 1: Automated Fix (Recommended)

Run the automated RPC function repair script:

```bash
# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Set required environment variables (replace with your values)
export NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run the fix script
node fix-rpc-function.js
```

### Option 2: Manual SQL Fix

Run the following SQL in the Supabase SQL Editor:

```sql
-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;

-- Drop function if exists to avoid conflicts
DROP FUNCTION IF EXISTS find_cities_within_radius(double precision, double precision, double precision);

-- Create the PostGIS helper function for geospatial city search
CREATE OR REPLACE FUNCTION find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision, 
  radius_meters double precision
)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param)) <= radius_meters
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND kma_code IS NOT NULL
  ORDER BY earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param))
  LIMIT 100;
$$ LANGUAGE sql STABLE;

-- Grant proper permissions for all roles
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO service_role;
```

## ✅ Verification Options

### Option 1: Browser-Based Verification (No Setup Required)

1. Log in to RapidRoutes in your browser
2. Open `quick-api-verification.html` in your browser
3. Click "Run All Tests" to verify both RPC function and API endpoint

### Option 2: Automated Verification Script

```bash
# Install dependencies if needed
npm install @supabase/supabase-js node-fetch dotenv

# Set required environment variables (replace with your values)
export NEXT_PUBLIC_API_URL=https://your-app-url.com
export NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
export TEST_SESSION_TOKEN=your-auth-token # Optional

# Run verification
node comprehensive-api-verification.js
```

## 🔧 What's Been Fixed

### 1. Added Missing Database Function

Created the required PostGIS `find_cities_within_radius` function for finding nearby cities based on coordinates.

### 2. Enhanced API Error Handling

Updated the intelligence-pairing endpoint with:

- Proper parameter validation
- Better error handling for database operations
- Meaningful error messages instead of 500 errors
- Fallback behavior when database operations fail

### 3. Created Verification Tools

Developed multiple verification methods:

- `fix-rpc-function.js` - Automated RPC function repair
- `comprehensive-api-verification.js` - Complete verification script
- `quick-api-verification.html` - Browser-based verification tool

## 🧪 Expected Test Results

A successful verification will show:

1. RPC Function Test: ✅ Working
   - Should find multiple cities near Raleigh, NC

2. API Endpoint Test: ✅ Working
   - Should return HTTP 200 status
   - Should include city pairs in the response
   - Multiple test lanes should work correctly

## 📋 Troubleshooting

If verification still fails:

1. Check Supabase database connectivity:
   - Verify credentials are correct
   - Ensure the cities table exists with proper columns
   - Confirm PostGIS extension is installed

2. Check API permissions:
   - Verify RPC function has proper grants
   - Ensure user has authentication token
   - Check RLS policies on the cities table

3. Enable debug mode:
   - Set `ALLOW_TEST_MODE=true` in environment variables
   - Check server logs for detailed error messages

## 🚀 Next Steps

1. Disable any temporary debug flags in production
2. Consider implementing monitoring for this API endpoint
3. Add comprehensive automated tests for the API

## 📄 Reference

### Required Database Schema

The `cities` table should have these columns:

- `city` (text)
- `state_or_province` (text)
- `zip` (text)
- `latitude` (double precision)
- `longitude` (double precision)
- `kma_code` (text)
- `kma_name` (text)

### API Parameters

The intelligence-pairing endpoint expects:

```json
{
  "lane": {
    "origin_city": "Raleigh",
    "origin_state": "NC",
    "origin_zip": "27601",
    "dest_city": "Charlotte",
    "dest_state": "NC",
    "dest_zip": "28202",
    "equipment_code": "V",
        "weight_lbs": 40000
  }
}
```
```