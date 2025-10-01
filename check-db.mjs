import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('lanes')
  .select('id, origin_city, origin_state, destination_city, destination_state, dest_city, dest_state, lane_status')
  .eq('lane_status', 'pending')
  .order('created_at', { ascending: false })
  .limit(30);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`\n=== PENDING LANES IN DATABASE: ${data.length} ===\n`);
data.forEach((lane, idx) => {
  const dest = lane.destination_city || lane.dest_city || 'NULL';
  const destState = lane.destination_state || lane.dest_state || '';
  console.log(`${idx + 1}. [${lane.id.substring(0, 12)}] ${lane.origin_city}, ${lane.origin_state} → ${dest}, ${destState}`);
});
