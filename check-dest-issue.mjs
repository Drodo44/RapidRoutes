import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: choices, error } = await supabase
  .from('lane_city_choices')
  .select('lane_id, origin_city, origin_state, dest_city, dest_state')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('\n🔍 CHECKING DESTINATION FIELDS:\n');
(choices || []).forEach((choice, i) => {
  console.log(`${i+1}. Lane ${choice.lane_id.slice(0,8)}:`);
  console.log(`   Origin: ${choice.origin_city}, ${choice.origin_state}`);
  console.log(`   Dest: ${choice.dest_city || 'MISSING'}, ${choice.dest_state || 'MISSING'}`);
  console.log('');
});

process.exit(0);
