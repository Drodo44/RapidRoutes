# Missing Cities Fix - RapidRoutes

## Issue Identified

The API is returning 400 Bad Request errors due to missing cities in the Supabase database:

- Pasco, WA
- Russellville, AR
- Vancouver, WA
- Frisco, TX

## Changes Made

1. **Enhanced Error Handling**
   - Updated the frontend to better detect and display city lookup errors
   - Added detailed error reporting for city lookup failures

2. **Verification Tool**
   - Created `scripts/verify-missing-cities.js` to check if cities exist in the database

3. **City Addition Tool**
   - Created `scripts/add-missing-cities.js` to add missing cities with proper geocoding

4. **Database Function**
   - Added `scripts/find_closest_kma.sql` to help find the appropriate KMA for new cities

## How To Fix

### 1. Verify Missing Cities

Run the city verification script to confirm which cities are missing:

```bash
cd /workspaces/RapidRoutes
node scripts/verify-missing-cities.js
```

### 2. Set Up Geocoding API Key

Get an API key from OpenCage Data or another geocoding service, then add it to your `.env` file:

```
GEOCODING_API_KEY=your_api_key_here
```

### 3. Add Missing Cities to Database

Install required dependencies:

```bash
npm install axios dotenv
```

Run the city addition script:

```bash
node scripts/add-missing-cities.js
```

### 4. Create Database Function

If not already available, create the `find_closest_kma` function in your Supabase database:

```sql
-- Connect to your Supabase PostgreSQL instance and run:
\i /workspaces/RapidRoutes/scripts/find_closest_kma.sql
```

Or use the Supabase SQL Editor to run the contents of the script.

### 5. Deploy Updated Frontend

Deploy the updated frontend code to properly handle and display city lookup errors.

## Expected Results

After adding the missing cities:

1. The intelligence pairing API should successfully process the lanes
2. DAT postings should generate correctly
3. Error messages will be more descriptive if additional city issues arise

## Additional Notes

- The city lookup is case-insensitive but requires exact spelling
- Each city must have proper KMA assignment for the pairing algorithm to work
- The geocoding process in the scripts helps ensure accurate latitude/longitude values
- Consider periodic database audits to catch missing cities proactively
