-- Check if ZIP3 190 exists in zip3_kma_geo table
SELECT * FROM zip3_kma_geo WHERE zip3 = '190';

-- Also check nearby ZIP3s
SELECT * FROM zip3_kma_geo WHERE zip3 LIKE '19%' ORDER BY zip3;
