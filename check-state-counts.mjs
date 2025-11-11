import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== STATE CITY COUNTS ===\n');

// Get all states with counts
const { data: allCities } = await supabase
  .from('cities')
  .select('state_or_province');

if (allCities) {
  const stateCounts = {};
  allCities.forEach(c => {
    stateCounts[c.state_or_province] = (stateCounts[c.state_or_province] || 0) + 1;
  });
  
  const sorted = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([state, count]) => {
    console.log(`${state}: ${count} cities`);
  });
}
