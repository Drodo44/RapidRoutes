import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get one city choice to see actual columns
const { data, error } = await supabase
  .from('lane_city_choices')
  .select('*')
  .limit(1)
  .single();

console.log('\n📋 lane_city_choices TABLE SCHEMA:');
console.log('Columns:', Object.keys(data || {}));
console.log('\nSample row:', data);

process.exit(0);
