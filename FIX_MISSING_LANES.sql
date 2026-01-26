-- EMERGENCY: Assign all orphaned lanes to the admin user
-- Your lanes are safe! They just don't have user_id set yet.

-- Step 1: Find your user ID
SELECT id, email, role FROM profiles WHERE role = 'Admin';

-- Step 2: Copy your ID from above and replace 'YOUR_USER_ID_HERE' below

-- Assign all lanes without a user_id to you
UPDATE lanes 
SET user_id = 'YOUR_USER_ID_HERE'
WHERE user_id IS NULL;

-- Verify it worked - count your lanes
SELECT COUNT(*) as total_lanes 
FROM lanes 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- See your lanes
SELECT id, origin_city, origin_state, dest_city, dest_state, lane_status, created_at
FROM lanes 
WHERE user_id = 'YOUR_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 20;
