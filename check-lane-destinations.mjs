import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: lanes, error } = await supabase
  .from('lanes')
  .select('id, reference_id, origin_city, origin_state, dest_city, destination_city, dest_state, destination_state')
  .or('reference_id.eq.RR67553,reference_id.eq.RR33008,reference_id.eq.RR25102867247')
  .limit(10);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Found lanes:', JSON.stringify(lanes, null, 2));
}
