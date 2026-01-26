// Debug CSV export filtering issue
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== CHECKING LANE ORGANIZATION IDS ===\n');

// Get all lanes with current status
const { data: lanes, error } = await supabase
  .from('lanes')
  .select('id, origin_city, origin_state, dest_city, dest_state, organization_id, created_at')
  .eq('lane_status', 'current')
  .order('created_at', { ascending: false })
  .limit(20);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log(`Found ${lanes.length} current lanes:\n`);

lanes.forEach((lane, i) => {
  const route = `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`;
  console.log(`${i+1}. ${route}`);
  console.log(`   Lane ID: ${lane.id.substring(0, 8)}...`);
  console.log(`   Org ID: ${lane.organization_id || 'NULL ❌'}`);
  console.log('');
});

// Get user profiles to see who owns what
console.log('\n=== USER PROFILES ===\n');
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, organization_id, role, team_name')
  .order('email');

profiles.forEach(p => {
  console.log(`${p.email} (${p.role})`);
  console.log(`  Org ID: ${p.organization_id}`);
  console.log(`  Team: ${p.team_name}`);
  console.log('');
});

// Check if lanes without org_id exist
const lanesWithoutOrg = lanes.filter(l => !l.organization_id);
if (lanesWithoutOrg.length > 0) {
  console.log(`\n⚠️  WARNING: ${lanesWithoutOrg.length} lanes have NULL organization_id!`);
  console.log('These lanes will be visible to everyone because org filtering will fail.\n');
}
