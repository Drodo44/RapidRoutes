# RapidRoutes Intelligence System Recipe

This document contains the complete recipe for the RapidRoutes intelligence system that powers city pairing for DAT CSV generation. Use this as the definitive reference when troubleshooting or rebuilding the system.

## System Components

1. **Database**: Supabase PostgreSQL with PostGIS extension
2. **Geospatial Function**: `find_cities_within_radius` custom RPC function
3. **API Endpoint**: `/api/intelligence-pairing.js` Next.js API route
4. **HERE.com Integration**: Smart fallback when Supabase diversity insufficient
5. **Mock Data System**: Fallback when database is unavailable

## Required Database Setup

### 1. PostGIS Extension

The PostGIS extension must be enabled in Supabase:

```sql
-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 2. Geospatial Function

This is the critical function that must exist in the database:

```sql
-- Create geospatial function using standard PostGIS ST_ functions
CREATE OR REPLACE FUNCTION find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision, 
  radius_miles double precision
)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng_param, lat_param)::geography,
    radius_miles * 1609.34  -- Convert miles to meters
  )
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
```

## API Requirements

### API Endpoint Structure

- **Path**: `/api/intelligence-pairing.js`
- **Method**: POST
- **Authentication**: Required (JWT token in Authorization header)

### Request Format

```json
{
  "lane": {
    "origin_city": "Atlanta",
    "origin_state": "GA",
    "origin_zip": "30303",
    "dest_city": "Chicago", 
    "dest_state": "IL",
    "dest_zip": "60601",
    "equipment_code": "V",
    "weight_lbs": 40000
  }
}
```

### Required Headers

```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

## HERE.com Integration

The system uses a smart integration with HERE.com that only activates when Supabase results lack sufficient KMA diversity:

### Integration Flow

1. Query Supabase for cities within radius (default 75 miles)
2. Count unique KMAs in results  
3. If KMAs >= 6: Skip HERE.com (cost savings)
4. If KMAs < 6: Call HERE.com for additional diversity
5. Combine both sources with intelligent scoring
6. Store HERE.com discoveries in database for future use

### HERE.com API Configuration

- Environment Variable: `HERE_API_KEY`
- Only used when Supabase returns less than 6 unique KMAs
- New cities from HERE.com are enriched with KMA codes from nearest Supabase cities

## Mock Data System

When the database is unavailable, the system falls back to mock data:

- Location: `/utils/mockCityData.js`
- Activation: When Supabase connection fails
- Configuration: Set `USE_MOCK_DATA_ON_ERROR = true` in intelligence-pairing.js

The mock data system should contain at least 6 unique KMAs for both origin and destination cities.

## KMA Requirements

- **Minimum Unique KMAs**: 6 per side (origin and destination)
- **Target Unique KMAs**: 12+ per side for optimal diversity
- **Purpose**: DAT CSV generation requires KMA diversity

## Radius Search Logic

1. Start with 75-mile radius (DAT standard)
2. If insufficient KMAs found, expand to 100 miles
3. Maximum radius cap: 150 miles
4. Distance calculations use PostGIS ST_DWithin for efficiency

## Testing Verification

To verify the system is working correctly:

1. Check that at least 6 unique KMAs are returned for both origin and destination
2. Ensure the API returns a 200 status with valid cityPairs array
3. Verify that the pairs have valid KMA codes
4. Confirm that the response contains appropriate metadata about KMA diversity

## Troubleshooting Guide

### Common Issues

1. **500 Server Error**:
   - Check if the `find_cities_within_radius` function exists in database
   - Verify PostGIS extension is enabled
   - Ensure Supabase service role key is valid

2. **'Less than 6 unique KMAs found' Warning**:
   - Issue: The pair generation algorithm was creating pairs with the same origin city (not using different origin cities)
   - Fix: Use this improved algorithm that maximizes KMA diversity:

   ```javascript
   // First, create a collection of origin cities with unique KMA codes
   const uniqueOriginCitiesByKma = {};
   for (const city of sortedOriginCities) {
     if (city.kma_code && !uniqueOriginCitiesByKma[city.kma_code]) {
       uniqueOriginCitiesByKma[city.kma_code] = city;
     }
   }
   
   // Do the same for destination cities
   const uniqueDestCitiesByKma = {};
   for (const city of sortedDestCities) {
     if (city.kma_code && !uniqueDestCitiesByKma[city.kma_code]) {
       uniqueDestCitiesByKma[city.kma_code] = city;
     }
   }
   
   const availableOriginKmas = Object.keys(uniqueOriginCitiesByKma);
   const availableDestKmas = Object.keys(uniqueDestCitiesByKma);
   
   // Phase 1: Create pairs using cities with unique KMAs
   const pairsToCreate = Math.min(maxPairs, availableOriginKmas.length, availableDestKmas.length);
   
   for (let i = 0; i < pairsToCreate; i++) {
     const originKma = availableOriginKmas[i];
     const destKma = availableDestKmas[i];
     
     const originCity = uniqueOriginCitiesByKma[originKma];
     const destCity = uniqueDestCitiesByKma[destKma];
     
     // Add pair and tracking...
   ```

   - Root cause: The original algorithm was only creating pairs with the first origin city, causing all pairs to use the same KMA code

3. **Insufficient KMA Diversity**:
   - Verify HERE.com API key is set correctly in environment variables
   - Check that mockCityData.js has sufficient city diversity
   - Increase search radius or add more cities to the database

4. **Authentication Failures**:
   - Verify JWT token format in Authorization header (Bearer prefix)
   - Check token expiration (Supabase tokens expire after 1 hour by default)
   - Ensure user has proper permissions in Supabase

## Fallback Mechanisms

The system has multiple fallback layers:

1. **Supabase Database** (primary data source)
2. **HERE.com API** (when Supabase has < 6 unique KMAs)
3. **Mock Data System** (when database connection fails)

All three systems must be properly configured to ensure the API never fails completely.

---

*This recipe was created on September 26, 2025, to document the exact intelligence system implementation.*
