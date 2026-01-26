// scripts/check-db-state.js
import { adminSupabase } from '../utils/supabaseClient.js';

async function checkDatabaseState() {
  console.log('🔍 Checking Database State\n');

  // Check schema information
  console.log('Checking Schema:');
  const { data: schemas, error: schemaError } = await adminSupabase
    .from('_schemas')
    .select('*');

  if (schemaError) {
    console.error('❌ Schema check failed:', schemaError.message);
  } else {
    console.log('Available schemas:', schemas?.map(s => s.name).join(', '));
  }

  // Check cities table structure
  console.log('\nChecking Cities Table Structure:');
  const { data: tableInfo, error: tableError } = await adminSupabase
    .from('cities')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Table check failed:', tableError.message);
  } else if (tableInfo && tableInfo[0]) {
    console.log('Columns present:', Object.keys(tableInfo[0]).join(', '));
  }

  // Check recent modifications
  console.log('\nChecking Recent Changes:');
  const { data: recentCities, error: recentError } = await adminSupabase
    .from('cities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('❌ Recent changes check failed:', recentError.message);
  } else if (recentCities) {
    console.log('Most recent city entries:');
    recentCities.forEach(city => {
      console.log(`  • ${city.city}, ${city.state_or_province} (KMA: ${city.kma_code || 'MISSING'})`);
    });
  }

  // Check distinct states coverage
  console.log('\nChecking Geographic Coverage:');
  const { data: states, error: statesError } = await adminSupabase
    .from('cities')
    .select('state_or_province')
    .order('state_or_province');

  if (statesError) {
    console.error('❌ States check failed:', statesError.message);
  } else if (states) {
    const uniqueStates = [...new Set(states.map(s => s.state_or_province))];
    console.log(`Found cities in ${uniqueStates.length} states/provinces:`);
    console.log(uniqueStates.join(', '));
  }

  // Check KMA distribution
  console.log('\nAnalyzing KMA Distribution:');
  const { data: kmaData, error: kmaError } = await adminSupabase
    .from('cities')
    .select('kma_code, state_or_province')
    .not('kma_code', 'is', null);

  if (kmaError) {
    console.error('❌ KMA check failed:', kmaError.message);
  } else if (kmaData) {
    const kmaByState = {};
    kmaData.forEach(row => {
      if (!kmaByState[row.state_or_province]) {
        kmaByState[row.state_or_province] = new Set();
      }
      kmaByState[row.state_or_province].add(row.kma_code);
    });

    console.log('\nKMAs per State:');
    Object.entries(kmaByState)
      .sort((a, b) => b[1].size - a[1].size)
      .forEach(([state, kmas]) => {
        console.log(`  • ${state}: ${kmas.size} unique KMAs`);
      });
  }
}

checkDatabaseState();