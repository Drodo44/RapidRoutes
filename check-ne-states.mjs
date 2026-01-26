import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Check what state values exist for New England
const { data, error } = await supabase
  .from('cities')
  .select('state_or_province')
  .in('state_or_province', ['MA', 'NH', 'ME', 'VT', 'RI', 'CT', 'NY', 'Massachusetts', 'New Hampshire', 'Maine', 'Vermont', 'Rhode Island', 'Connecticut', 'New York']);

if (error) {
  console.error('Error:', error);
} else {
  const stateCounts = {};
  for (const row of data) {
    const state = row.state_or_province;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
  }
  console.log('New England state counts in database:');
  console.log(JSON.stringify(stateCounts, null, 2));
  console.log(`\nTotal cities: ${data.length}`);
}
