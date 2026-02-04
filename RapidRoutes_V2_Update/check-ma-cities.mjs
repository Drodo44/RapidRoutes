import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  console.log('URL:', !!url, 'Key:', !!key);
  process.exit(1);
}

const supabase = createClient(url, key);

console.log('=== CHECKING FOR NEW ENGLAND CITIES ===\n');

const { data: ma, error: maErr } = await supabase
  .from('cities')
  .select('city, state_or_province, kma_code')
  .eq('state_or_province', 'MA')
  .limit(5);

console.log('MA cities:', ma?.length || 0, maErr?.message || '');
if (ma?.length) console.log('  Sample:', ma.slice(0, 3).map(c => c.city).join(', '));

const { data: states } = await supabase
  .from('cities')
  .select('state_or_province')
  .limit(5000);

const unique = [...new Set(states?.map(s => s.state_or_province) || [])].sort();
console.log('\nDistinct states in database:', unique.join(', '));
