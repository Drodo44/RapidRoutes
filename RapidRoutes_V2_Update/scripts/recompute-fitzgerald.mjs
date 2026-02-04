// ============================================================================
// RECOMPUTE FITZGERALD - Test Fix
// ============================================================================
// Purpose: Recompute Fitzgerald to verify the .limit(30000) fix works
// Should find 50+ cities instead of just 3
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function recomputeFitzgerald() {
  console.log('🔍 Fetching Fitzgerald, GA...\n');
  
  // Get Fitzgerald
  const { data: fitz, error: fitzError } = await supabase
    .from('cities')
    .select('id, city, state_or_province, latitude, longitude')
    .eq('city', 'Fitzgerald')
    .eq('state_or_province', 'GA')
    .single();
  
  if (fitzError) throw fitzError;
  
  console.log(`📍 ${fitz.city}, ${fitz.state_or_province}`);
  console.log(`   Lat: ${fitz.latitude}, Lon: ${fitz.longitude}\n`);
  
  console.log('🌎 Fetching ALL cities (with pagination)...\n');
  
  // CRITICAL FIX: Use pagination to get ALL cities (Supabase limits to 1000 per request)
  let allCities = [];
  let from = 0;
  const pageSize = 1000;
  let page = 1;
  
  while (true) {
    console.log(`   📄 Fetching page ${page} (${from} - ${from + pageSize})...`);
    
    const { data: batch, error: batchError } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude, id')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .neq('id', fitz.id)
      .range(from, from + pageSize - 1);
    
    if (batchError) throw batchError;
    if (!batch || batch.length === 0) break;
    
    allCities.push(...batch);
    from += pageSize;
    page++;
    
    if (batch.length < pageSize) break; // Last page
  }
  
  console.log(`✅ Fetched ${allCities.length} cities\n`);
  
  // Calculate distances
  const nearby = [];
  for (const c of allCities) {
    const distance = calculateDistance(
      fitz.latitude, fitz.longitude,
      c.latitude, c.longitude
    );
    
    if (distance <= 100) {
      nearby.push({
        city: c.city,
        state: c.state_or_province,
        zip: c.zip,
        kma_code: c.kma_code,
        kma_name: c.kma_name,
        latitude: c.latitude,
        longitude: c.longitude,
        miles: Math.round(distance * 10) / 10
      });
    }
  }
  
  console.log(`🎯 Found ${nearby.length} cities within 100 miles\n`);
  
  // Sort by distance
  nearby.sort((a, b) => a.miles - b.miles);
  
  // Show first 20
  console.log('📋 First 20 closest cities:');
  nearby.slice(0, 20).forEach((c, i) => {
    console.log(`   ${i+1}. ${c.miles}mi: ${c.city}, ${c.state} (${c.kma_code || 'NO_KMA'})`);
  });
  
  // Group by KMA
  const kmaGroups = {};
  for (const n of nearby) {
    const kma = n.kma_code || 'NO_KMA';
    if (!kmaGroups[kma]) {
      kmaGroups[kma] = [];
    }
    kmaGroups[kma].push(n);
  }
  
  console.log('\n📊 KMA Breakdown:');
  Object.entries(kmaGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([kma, cities]) => {
      console.log(`   ${kma}: ${cities.length} cities`);
    });
  
  // Save to database
  console.log('\n💾 Saving to database...');
  
  const result = {
    computed_at: new Date().toISOString(),
    kmas: kmaGroups
  };
  
  const { error: updateError } = await supabase
    .from('cities')
    .update({ nearby_cities: result })
    .eq('id', fitz.id);
  
  if (updateError) throw updateError;
  
  console.log('✅ Fitzgerald updated successfully!');
  console.log(`\n🎉 OLD: 3 cities → NEW: ${nearby.length} cities\n`);
}

recomputeFitzgerald().catch(error => {
  console.error('\n❌ ERROR:', error);
  process.exit(1);
});
