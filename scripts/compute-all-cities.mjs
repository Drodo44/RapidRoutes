// ============================================================================
// COMPUTE ALL NEARBY CITIES - Backend Script
// ============================================================================
// Purpose: Pre-compute nearby cities for ALL 30,000+ locations
// Strategy: Process in small batches from Node.js (no Supabase timeout)
// Performance: ~30-45 minutes total
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function computeAllNearbyCities() {
  const BATCH_SIZE = 10; // Small batches to avoid memory issues
  
  console.log('🚀 Starting full database computation...\n');
  
  // Get total count
  const { count, error: countError } = await supabase
    .from('cities')
    .select('id', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  
  if (countError) throw countError;
  
  console.log(`📍 Total cities to process: ${count}\n`);
  console.log(`⏱️  Estimated time: ${Math.round(count / BATCH_SIZE / 60)} minutes\n`);
  console.log('===========================================\n');
  
  let processed = 0;
  let offset = 0;
  
  while (processed < count) {
    const startTime = Date.now();
    
    // Fetch batch of cities
    const { data: batch, error: batchError } = await supabase
      .from('cities')
      .select('id, city, state_or_province, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .is('nearby_cities', null)
      .order('id')
      .range(0, BATCH_SIZE - 1);
    
    if (batchError) throw batchError;
    if (!batch || batch.length === 0) break;
    
    // Process each city in the batch
    for (const city of batch) {
      await computeForSingleCity(city);
      processed++;
      
      if (processed % 50 === 0 || processed === count) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const progress = ((processed / count) * 100).toFixed(1);
        console.log(`✅ Processed: ${processed} / ${count} cities (${progress}%) - Batch time: ${elapsed}s`);
      }
    }
    
    offset += BATCH_SIZE;
  }
  
  console.log('\n===========================================');
  console.log('🎉 Computation complete!');
  console.log(`📊 Total cities processed: ${processed}`);
  console.log('===========================================\n');
}

async function computeForSingleCity(city) {
  try {
    // Use raw SQL query instead of RPC to avoid type mismatch
    const { data: nearbyCities, error } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .neq('id', city.id);
    
    if (error) {
      console.error(`❌ Error fetching for ${city.city}, ${city.state_or_province}:`, error.message);
      return;
    }
    
    // Filter and calculate distances in Node.js
    const nearby = [];
    for (const c of nearbyCities) {
      const distance = calculateDistance(
        city.latitude, city.longitude,
        c.latitude, c.longitude
      );
      
      if (distance <= 100 && (c.city !== city.city || c.state_or_province !== city.state_or_province)) {
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
    
    // Sort by distance
    nearby.sort((a, b) => a.miles - b.miles);
    
    // Group by KMA
    const kmaGroups = {};
    for (const n of nearby) {
      const kma = n.kma_code || 'NO_KMA';
      if (!kmaGroups[kma]) {
        kmaGroups[kma] = [];
      }
      kmaGroups[kma].push(n);
    }
    
    // Save to database
    const result = {
      computed_at: new Date().toISOString(),
      kmas: kmaGroups
    };
    
    await supabase
      .from('cities')
      .update({ nearby_cities: result })
      .eq('id', city.id);
      
  } catch (err) {
    console.error(`❌ Exception for ${city.city}, ${city.state_or_province}:`, err.message);
  }
}

// Haversine formula to calculate distance between two points
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

// Run it
computeAllNearbyCities().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
