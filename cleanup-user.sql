-- Cleanup script for removing a user and all their data
-- Replace 'USER_ID_HERE' with the actual user ID from Supabase Auth

-- Step 1: Check what data they have
SELECT 'lanes' as table_name, COUNT(*) as count FROM lanes WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'posted_pairs', COUNT(*) FROM posted_pairs WHERE created_by = 'USER_ID_HERE'
UNION ALL
SELECT 'city_performance', COUNT(*) FROM city_performance WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles WHERE id = 'USER_ID_HERE';

-- Step 2: Delete their data (in correct order to respect foreign keys)

-- Delete posted pairs first (references lanes)
DELETE FROM posted_pairs WHERE created_by = 'USER_ID_HERE';

-- Delete lanes
DELETE FROM lanes WHERE user_id = 'USER_ID_HERE';

-- Delete city performance data if table exists
DELETE FROM city_performance WHERE user_id = 'USER_ID_HERE';

-- Delete their profile (if you have a profiles table)
DELETE FROM profiles WHERE id = 'USER_ID_HERE';

-- Step 3: Now you can delete from Supabase Auth UI
-- Go to Authentication → Users → Delete user
