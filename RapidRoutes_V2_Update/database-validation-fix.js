// Diagnostic script to check pending lanes validation status
// Run this in production environment with proper environment variables

const diagnosticQuery = `
-- Check pending lanes validation status
SELECT 
  id,
  origin_city,
  origin_state,
  dest_city,
  dest_state,
  reference_id,
  pickup_earliest,
  pickup_latest,
  created_at,
  CASE 
    WHEN reference_id IS NULL THEN 'Missing reference_id'
    WHEN reference_id !~ '^RR\\d{5}$' THEN 'Invalid reference_id format'
    ELSE 'Valid reference_id'
  END as ref_id_status,
  CASE 
    WHEN pickup_earliest IS NULL THEN 'Missing pickup_earliest'
    WHEN pickup_earliest !~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 'Invalid pickup_earliest format'
    ELSE 'Valid pickup_earliest'
  END as earliest_status,
  CASE 
    WHEN pickup_latest IS NULL THEN 'Missing pickup_latest'
    WHEN pickup_latest !~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 'Invalid pickup_latest format'
    ELSE 'Valid pickup_latest'
  END as latest_status
FROM lanes 
WHERE status = 'pending'
ORDER BY created_at DESC;
`;

console.log('🔍 DIAGNOSTIC QUERY FOR PENDING LANES VALIDATION');
console.log('===============================================\n');
console.log('Run this SQL query in your Supabase dashboard or pgAdmin:\n');
console.log(diagnosticQuery);

console.log('\n📋 EXPECTED RESULTS:');
console.log('- ref_id_status should be "Valid reference_id" for all rows');
console.log('- earliest_status should be "Valid pickup_earliest" for all rows');
console.log('- latest_status should be "Valid pickup_latest" for all rows');

console.log('\n🛠️  IF FIXES ARE NEEDED, USE THESE UPDATE QUERIES:\n');

const fixQueries = `
-- Fix invalid or missing reference_id (generates RR + 5 digits)
UPDATE lanes 
SET reference_id = 'RR' || LPAD((ABS(HASHTEXT(id::text)) % 100000)::text, 5, '0')
WHERE status = 'pending' 
  AND (reference_id IS NULL OR reference_id !~ '^RR\\d{5}$');

-- Fix invalid pickup_earliest dates (convert to ISO format)
UPDATE lanes 
SET pickup_earliest = CASE
  WHEN pickup_earliest ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN 
    TO_CHAR(TO_DATE(pickup_earliest, 'MM/DD/YYYY'), 'YYYY-MM-DD')
  WHEN pickup_earliest IS NULL OR pickup_earliest = '' THEN 
    CURRENT_DATE::text
  ELSE 
    COALESCE(TO_CHAR(pickup_earliest::date, 'YYYY-MM-DD'), CURRENT_DATE::text)
END
WHERE status = 'pending' 
  AND (pickup_earliest IS NULL OR pickup_earliest !~ '^\\d{4}-\\d{2}-\\d{2}$');

-- Fix invalid pickup_latest dates (convert to ISO format)
UPDATE lanes 
SET pickup_latest = CASE
  WHEN pickup_latest ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN 
    TO_CHAR(TO_DATE(pickup_latest, 'MM/DD/YYYY'), 'YYYY-MM-DD')
  WHEN pickup_latest IS NULL OR pickup_latest = '' THEN 
    COALESCE(pickup_earliest, CURRENT_DATE::text)
  ELSE 
    COALESCE(TO_CHAR(pickup_latest::date, 'YYYY-MM-DD'), COALESCE(pickup_earliest, CURRENT_DATE::text))
END
WHERE status = 'pending' 
  AND (pickup_latest IS NULL OR pickup_latest !~ '^\\d{4}-\\d{2}-\\d{2}$');

-- Verify fixes (run this after the updates above)
SELECT 
  COUNT(*) as total_pending,
  COUNT(CASE WHEN reference_id ~ '^RR\\d{5}$' THEN 1 END) as valid_ref_ids,
  COUNT(CASE WHEN pickup_earliest ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 1 END) as valid_earliest,
  COUNT(CASE WHEN pickup_latest ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN 1 END) as valid_latest
FROM lanes 
WHERE status = 'pending';
`;

console.log(fixQueries);

console.log('\n🎯 VALIDATION REQUIREMENTS:');
console.log('- reference_id: Must match /^RR\\d{5}$/ (exactly "RR" + 5 digits)');
console.log('- pickup_earliest: Must be ISO date format YYYY-MM-DD');
console.log('- pickup_latest: Must be ISO date format YYYY-MM-DD');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Run the diagnostic query to identify issues');
console.log('2. Run the fix queries to correct invalid data');
console.log('3. Run the verification query to confirm fixes');
console.log('4. Test /api/exportDatCsv?pending=1 endpoint');

export { diagnosticQuery, fixQueries };