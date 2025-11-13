import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const checkStates = ['MA', 'NH', 'VT', 'RI', 'ME', 'CT', 'NJ', 'GA', 'NC', 'AK', 'HI'];

console.log('Quick check of key states:\n');
for (const state of checkStates) {
  const { count } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', state);
  console.log(`${state}: ${count || 0} cities`);
}
