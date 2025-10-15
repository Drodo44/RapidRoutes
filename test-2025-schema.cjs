const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing dat_loads_2025 table access...\n');
  
  const { data, error, count } = await supabase
    .from('dat_loads_2025')
    .select('*', { count: 'exact' })
    .limit(2);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`✅ Query succeeded. Count: ${count}, Rows returned: ${data?.length ?? 0}\n`);
  
  if (data && data.length > 0) {
    console.log('First row sample:');
    const row = data[0];
    console.log(`  Shipment/Load ID: ${row["Shipment/Load ID"]}`);
    console.log(`  Origin City: ${row["Origin City"]}`);
    console.log(`  Origin State: ${row["Origin State"]}`);
    console.log(`  Destination City: ${row["Destination City"]}`);
    console.log(`  Destination State: ${row["Destination State"]}`);
    console.log(`  Equipment: ${row["Equipment"]}`);
    console.log(`  Pickup Date: ${row["Pickup Date"]}`);
  }
  
  // Test KMA lookup
  console.log('\nTesting city_kma_mode_clean table...');
  const { data: kmaData, error: kmaError, count: kmaCount } = await supabase
    .from('city_kma_mode_clean')
    .select('*', { count: 'exact' })
    .limit(3);
    
  if (kmaError) {
    console.error('❌ KMA Error:', kmaError.message);
  } else {
    console.log(`✅ KMA table has ${kmaCount} rows`);
    if (kmaData && kmaData.length > 0) {
      console.log('Sample KMA row:');
      console.log(`  City: ${kmaData[0].city}`);
      console.log(`  State: ${kmaData[0].state}`);
      console.log(`  KMA Code: ${kmaData[0].kma_code}`);
      console.log(`  KMA Name: ${kmaData[0].kma_name}`);
    }
  }
}

test().catch(console.error);
