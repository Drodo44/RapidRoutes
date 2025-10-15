const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Fetching sample row from dat_loads_ytd...\n');
  const { data, error } = await supabase
    .from('dat_loads_ytd')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('✅ Sample row columns:');
    const keys = Object.keys(data[0]);
    console.log(`\nFound ${keys.length} columns:`);
    keys.forEach(key => {
      const value = data[0][key];
      const type = typeof value;
      const display = value === null ? 'null' : (type === 'string' && value.length > 50 ? value.substring(0, 47) + '...' : value);
      console.log(`  ${key}: ${display} (${type})`);
    });
  } else {
    console.log('⚠️  No data returned');
  }
}

test().catch(console.error);
