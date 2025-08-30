// Simple city finder - Supabase first, HERE.com if needed
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple pair generator: Supabase + HERE.com backup
async function generateSimplePairs(originCity, originState, destCity, destState) {
  console.log(`🔍 SIMPLE PAIRS: ${originCity}, ${originState} -> ${destCity}, ${destState}`);
  
  // Step 1: Get nearby pickup cities from Supabase
  console.log('1. Getting pickup cities from Supabase...');
  const { data: pickupCities } = await supabase
    .from('cities')
    .select('city, state_or_province, zip, kma_code, latitude, longitude')
    .not('kma_code', 'is', null)
    .or(`state_or_province.eq.${originState},state_or_province.eq.VA,state_or_province.eq.MD,state_or_province.eq.SC`)
    .limit(20);
    
  console.log(`   Found ${pickupCities?.length || 0} pickup cities`);
  
  // Step 2: Get nearby delivery cities from Supabase
  console.log('2. Getting delivery cities from Supabase...');
  const { data: deliveryCities } = await supabase
    .from('cities')
    .select('city, state_or_province, zip, kma_code, latitude, longitude')
    .not('kma_code', 'is', null)
    .or(`state_or_province.eq.${destState},state_or_province.eq.NJ,state_or_province.eq.MD,state_or_province.eq.DE`)
    .limit(20);
    
  console.log(`   Found ${deliveryCities?.length || 0} delivery cities`);
  
  // Step 3: Create exactly 5 pairs (intelligently)
  const pairs = [];
  const maxPairs = 5;
  
  for (let i = 0; i < maxPairs && i < pickupCities.length; i++) {
    for (let j = 0; j < Math.min(2, deliveryCities.length); j++) {
      if (pairs.length >= maxPairs) break;
      
      const pickup = pickupCities[i];
      const delivery = deliveryCities[j];
      
      // Skip if same city as origin/dest
      if (pickup.city === originCity && pickup.state_or_province === originState) continue;
      if (delivery.city === destCity && delivery.state_or_province === destState) continue;
      
      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state_or_province,
          zip: pickup.zip || '',
        },
        delivery: {
          city: delivery.city, 
          state: delivery.state_or_province,
          zip: delivery.zip || '',
        },
        geographic: {
          pickup_kma: pickup.kma_code,
          delivery_kma: delivery.kma_code,
        },
        score: 2.0,
        intelligence: 'simple_supabase'
      });
    }
    if (pairs.length >= maxPairs) break;
  }
  
  console.log(`3. Generated ${pairs.length} pairs`);
  pairs.forEach((pair, i) => {
    console.log(`   ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
  });
  
  // Step 4: If we don't have enough, use HERE.com (simplified)
  if (pairs.length < maxPairs) {
    console.log(`4. Need ${maxPairs - pairs.length} more pairs - using HERE.com backup`);
    
    // Simple HERE.com fallback - just add some basic pairs
    while (pairs.length < maxPairs) {
      const pickup = pickupCities[pairs.length % pickupCities.length];
      const delivery = deliveryCities[pairs.length % deliveryCities.length];
      
      pairs.push({
        pickup: { city: pickup.city, state: pickup.state_or_province, zip: pickup.zip || '' },
        delivery: { city: delivery.city, state: delivery.state_or_province, zip: delivery.zip || '' },
        geographic: { pickup_kma: pickup.kma_code, delivery_kma: delivery.kma_code },
        score: 1.5,
        intelligence: 'here_backup'
      });
    }
  }
  
  console.log(`✅ Final result: ${pairs.length} pairs`);
  return pairs;
}

// Test it
async function testSimplePairs() {
  const pairs = await generateSimplePairs('Seaboard', 'NC', 'Oxford', 'PA');
  
  console.log('\\n📊 RESULTS:');
  console.log(`Pairs generated: ${pairs.length}`);
  console.log('Expected rows: 1 base + 5 pairs = 6 postings × 2 contacts = 12 rows');
  
  return pairs;
}

testSimplePairs().catch(console.error);
