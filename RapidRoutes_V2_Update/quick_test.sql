SELECT city, state_or_province, kma_code FROM cities WHERE city ILIKE '%charlotte%' AND state_or_province ILIKE '%nc%' LIMIT 5;
