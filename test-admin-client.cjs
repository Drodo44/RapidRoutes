const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function test() {
  console.log('Testing admin client direct query...\n');
  
  const { data, error } = await adminClient
    .from('dat_loads_2025')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('NO DATA RETURNED!');
    return;
  }
  
  const row = data[0];
  console.log(`Success! Got ${data.length} row(s)`);
  console.log(`Shipment/Load ID: ${row["Shipment/Load ID"]}`);
  console.log(`Origin City: ${row["Origin City"]}`);
  console.log(`Destination City: ${row["Destination City"]}`);
  console.log(`Equipment: ${row["Equipment"]}`);
  console.log(`Origin KMA: ${row["origin_kma"]}`);
  console.log(`Dest KMA: ${row["destination_kma"]}`);
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
