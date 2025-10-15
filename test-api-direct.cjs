const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectQuery() {
  console.log('Testing direct query to dat_loads_2025...\n');
  
  const { data, error } = await supabase
    .from('dat_loads_2025')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No data returned');
    return;
  }
  
  const row = data[0];
  console.log('Column names and sample values:');
  console.log('=====================================');
  
  Object.keys(row).sort().forEach(key => {
    const value = row[key];
    const displayValue = value === null ? 'NULL' : 
                        typeof value === 'string' ? `"${value.substring(0, 50)}"` : 
                        value;
    console.log(`${key}: ${displayValue}`);
  });
  
  console.log('\n\nChecking specific columns used in laneService.ts:');
  console.log('=================================================');
  console.log(`"Shipment/Load ID": ${row["Shipment/Load ID"]}`);
  console.log(`"Origin City": ${row["Origin City"]}`);
  console.log(`"Origin State": ${row["Origin State"]}`);
  console.log(`"Destination City": ${row["Destination City"]}`);
  console.log(`"Destination State": ${row["Destination State"]}`);
  console.log(`"Equipment": ${row["Equipment"]}`);
  console.log(`"Pickup Date": ${row["Pickup Date"]}`);
  console.log(`"origin_kma": ${row["origin_kma"]}`);
  console.log(`"destination_kma": ${row["destination_kma"]}`);
}

testDirectQuery().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
