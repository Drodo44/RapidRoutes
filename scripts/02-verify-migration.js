#!/usr/bin/env node
/**
 * VERIFY MIGRATION SUCCESS
 * Checks that nearby cities were computed correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
  console.log('\n🔍 Verifying migration...\n');
  
  // Check column exists
  const { data: sampleCity, error } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities')
    .not('nearby_cities', 'is', null)
    .limit(1)
    .single();
  
  if (error) {
    console.error('❌ Migration not complete or failed:', error.message);
    console.log('\n💡 Make sure you ran both SQL scripts in Supabase SQL Editor\n');
    return;
  }
  
  if (!sampleCity || !sampleCity.nearby_cities) {
    console.log('⚠️  Column exists but no data computed yet');
    console.log('   The batch computation may still be running...\n');
    return;
  }
  
  console.log('✅ Migration successful!');
  console.log(`\n📊 Sample city: ${sampleCity.city}, ${sampleCity.state_or_province}`);
  console.log(`   Nearby cities: ${sampleCity.nearby_cities.total_cities || 0}`);
  console.log(`   KMAs: ${sampleCity.nearby_cities.total_kmas || 0}\n`);
  
  // Get overall stats
  const { count } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .not('nearby_cities', 'is', null)
    .neq('nearby_cities', '{}');
  
  console.log(`📈 Total cities with computed data: ${count}\n`);
  
  if (count < 1000) {
    console.log('⚠️  Computation may still be running. Check again in a few minutes.\n');
  } else {
    console.log('🎉 System ready! Proceeding to Phase 2: UI Development\n');
  }
}

verify().catch(console.error);
