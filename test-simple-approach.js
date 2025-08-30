#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Test the simple approach
async function testSimpleApproach() {
  console.log('🧪 TESTING SIMPLE APPROACH');
  console.log('==========================');

  try {
    // Import after dotenv
    const { createClient } = await import('@supabase/supabase-js');
    const { verifyCityWithHERE } = await import('./lib/hereVerificationService.js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test data
    const origin = { city: 'Seaboard', state: 'NC' };
    const dest = { city: 'Oxford', state: 'PA' };
    
    console.log(`\n1. Testing origin: ${origin.city}, ${origin.state}`);
    
    // Step 1: Check Supabase for nearby cities
    const { data: pickupCities } = await supabase
      .from('cities')
      .select('city, state_or_province as state, zip, kma_code, latitude, longitude')
      .neq('city', origin.city)
      .eq('state_or_province', origin.state)
      .limit(10);
    
    console.log(`   Supabase found ${pickupCities?.length || 0} pickup options in ${origin.state}`);
    
    if (pickupCities?.length >= 3) {
      console.log('   ✅ Enough cities from Supabase');
      pickupCities.slice(0, 3).forEach((city, i) => {
        console.log(`   ${i+1}. ${city.city}, ${city.state} (${city.kma_code})`);
      });
    } else {
      console.log('   ⚠️ Not enough cities, would need HERE.com');
      
      // Test HERE.com fallback
      const hereResult = await verifyCityWithHERE('Wilmington', 'NC', '', 'test', 'system');
      console.log(`   HERE.com test: ${hereResult.verified ? '✅ Working' : '❌ Failed'}`);
    }

    console.log(`\n2. Testing destination: ${dest.city}, ${dest.state}`);
    
    // Step 2: Check Supabase for delivery cities  
    const { data: deliveryCities } = await supabase
      .from('cities')
      .select('city, state_or_province as state, zip, kma_code')
      .neq('city', dest.city)
      .eq('state_or_province', dest.state)
      .limit(10);
    
    console.log(`   Supabase found ${deliveryCities?.length || 0} delivery options in ${dest.state}`);
    
    if (deliveryCities?.length >= 5) {
      console.log('   ✅ Enough cities from Supabase');
      deliveryCities.slice(0, 5).forEach((city, i) => {
        console.log(`   ${i+1}. ${city.city}, ${city.state} (${city.kma_code})`);
      });
    }

    console.log(`\n3. Simple Pair Generation Test:`);
    const pickups = pickupCities?.slice(0, 3) || [];
    const deliveries = deliveryCities?.slice(0, 5) || [];
    
    console.log(`   Available: ${pickups.length} pickups × ${deliveries.length} deliveries`);
    console.log(`   Can generate: ${Math.min(pickups.length, deliveries.length, 5)} pairs`);
    
    const pairs = [];
    for (let i = 0; i < Math.min(pickups.length, deliveries.length, 5); i++) {
      pairs.push({
        pickup: pickups[i % pickups.length],
        delivery: deliveries[i]
      });
    }
    
    console.log(`   Generated ${pairs.length} pairs:`);
    pairs.forEach((pair, i) => {
      console.log(`   ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
    });

    console.log(`\n✅ Simple approach test: ${pairs.length === 5 ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`   Expected 5 pairs, got ${pairs.length} pairs`);
    console.log(`   Row calculation: (1 base + ${pairs.length} pairs) × 2 contacts = ${(1 + pairs.length) * 2} rows`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testSimpleApproach();
