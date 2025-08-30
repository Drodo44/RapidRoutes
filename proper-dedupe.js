// Proper city deduplication - one entry per city name + state
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function properDeduplication() {
  console.log('🔧 PROPER CITY DEDUPLICATION');
  console.log('============================');
  
  // Get all cities
  let allCities = [];
  let start = 0;
  const batchSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .range(start, start + batchSize - 1);
    
    if (error) {
      console.error('Error fetching cities:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allCities.push(...data);
    start += batchSize;
    
    if (data.length < batchSize) break; // Last batch
  }
  
  console.log(`📊 Total cities: ${allCities.length}`);
  
  // Group by city name + state (case-insensitive)
  const cityMap = new Map();
  
  allCities.forEach(city => {
    const cityName = city.city?.toLowerCase().trim() || '';
    const stateName = city.state_or_province?.toLowerCase().trim() || '';
    const key = `${cityName}_${stateName}`;
    
    if (!cityMap.has(key)) {
      cityMap.set(key, []);
    }
    cityMap.get(key).push(city);
  });
  
  console.log(`📊 Unique city+state combinations: ${cityMap.size}`);
  
  // Find the best representative for each city
  const toKeep = [];
  const toDelete = [];
  
  for (const [key, cities] of cityMap) {
    if (cities.length === 1) {
      toKeep.push(cities[0]);
      continue;
    }
    
    // Pick the best one (has KMA, has coordinates, shortest ZIP)
    const best = cities.sort((a, b) => {
      // 1. Has KMA code
      if (a.kma_code && !b.kma_code) return -1;
      if (!a.kma_code && b.kma_code) return 1;
      
      // 2. Has coordinates
      if (a.latitude && a.longitude && (!b.latitude || !b.longitude)) return -1;
      if ((!a.latitude || !a.longitude) && b.latitude && b.longitude) return 1;
      
      // 3. Has ZIP
      if (a.zip && !b.zip) return -1;
      if (!a.zip && b.zip) return 1;
      
      // 4. Shorter ZIP (main ZIP vs ZIP+4)
      if (a.zip && b.zip && a.zip.length !== b.zip.length) {
        return a.zip.length - b.zip.length;
      }
      
      return 0;
    })[0];
    
    toKeep.push(best);
    toDelete.push(...cities.filter(c => c.id !== best.id));
    
    if (cities.length > 3) {
      console.log(`🔍 ${best.city}, ${best.state_or_province}: keeping 1 of ${cities.length} (${best.zip}, ${best.kma_code})`);
    }
  }
  
  console.log(`\\n📊 DEDUPLICATION RESULTS:`);
  console.log(`  Unique cities: ${toKeep.length}`);
  console.log(`  Duplicates to delete: ${toDelete.length}`);
  console.log(`  Space savings: ${((toDelete.length / allCities.length) * 100).toFixed(1)}%`);
  
  // Delete duplicates in batches
  console.log(`\\n🗑️  Deleting ${toDelete.length} duplicates...`);
  
  const deleteBatchSize = 100;
  for (let i = 0; i < toDelete.length; i += deleteBatchSize) {
    const batch = toDelete.slice(i, i + deleteBatchSize);
    const ids = batch.map(c => c.id);
    
    const { error } = await supabase
      .from('cities')
      .delete()
      .in('id', ids);
    
    if (error) {
      console.error(`Error deleting batch:`, error);
      break;
    }
    
    if (i % (deleteBatchSize * 10) === 0) {
      console.log(`  ✅ Deleted ${i + batch.length}/${toDelete.length}`);
    }
  }
  
  // Final count
  const { count: finalCount } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true });
    
  console.log(`\\n🎉 DEDUPLICATION COMPLETE!`);
  console.log(`  Final count: ${finalCount} cities`);
  console.log(`  Removed: ${allCities.length - finalCount} duplicates`);
}

properDeduplication().catch(console.error);
