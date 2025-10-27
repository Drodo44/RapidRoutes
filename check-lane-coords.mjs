import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('lanes')
  .select('id, origin_city, origin_state, destination_city, destination_state, origin_latitude, origin_longitude, dest_latitude, dest_longitude')
  .eq('id', 'c92691ee-0bf9-4349-aeb3-a0ab093f5e0b')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log(JSON.stringify(data, null, 2));
}
