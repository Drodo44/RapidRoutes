import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('cities')
  .select('*')
  .eq('city', 'Piney Flats')
  .eq('state_or_province', 'TN')
  .single();

if (error) {
  console.error('Error:', error);
} else {
  console.log('City data:', JSON.stringify(data, null, 2));
}
