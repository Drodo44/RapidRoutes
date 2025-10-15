const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data } = await supabase
    .from('dat_loads_2025')
    .select('*')
    .limit(1);

  if (data && data.length > 0) {
    const row = data[0];
    console.log('All column names:');
    Object.keys(row).forEach(key => {
      console.log(`  "${key}"`);
    });
    
    console.log('\nAccess tests:');
    console.log(`  row["Shipment/Load ID"] = ${row["Shipment/Load ID"]}`);
    console.log(`  row["Origin City"] = ${row["Origin City"]}`);
    console.log(`  row["Equipment"] = ${row["Equipment"]}`);
  }
}

test().catch(console.error);
