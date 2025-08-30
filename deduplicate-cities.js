// Deduplicate cities table - keep one ZIP per city
// This will dramatically improve city selection performance
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deduplicateCities() {
  console.log('🔧 DEDUPLICATING CITIES TABLE');
  console.log('============================');
  
  // Step 1: Get current counts
  const { data: allCities, error: fetchError } = await supabase
    .from('cities')
    .select('*');
  
  if (fetchError) {
    console.error('Error fetching cities:', fetchError);
    return;
  }
  
  console.log(`📊 Current cities in database: ${allCities.length}`);
  
  // Step 2: Group by city + state combination
  const cityGroups = new Map();
  
  allCities.forEach(city => {
    const key = `${city.city.toLowerCase().trim()}_${city.state_or_province?.toLowerCase().trim() || ''}`;
    
    if (!cityGroups.has(key)) {
      cityGroups.set(key, []);
    }
    cityGroups.get(key).push(city);
  });
  
  console.log(`📊 Unique city/state combinations: ${cityGroups.size}`);
  
  // Step 3: Select best representative for each city
  const keepCities = [];
  const deleteCities = [];
  
  for (const [cityKey, duplicates] of cityGroups) {
    if (duplicates.length === 1) {
      // No duplicates, keep as is
      keepCities.push(duplicates[0]);
      continue;
    }
    
    // Multiple entries - pick the best one
    const sorted = duplicates.sort((a, b) => {
      // Priority 1: Has KMA code
      if (a.kma_code && !b.kma_code) return -1;
      if (!a.kma_code && b.kma_code) return 1;
      
      // Priority 2: Has latitude/longitude
      if (a.latitude && a.longitude && (!b.latitude || !b.longitude)) return -1;
      if ((!a.latitude || !a.longitude) && b.latitude && b.longitude) return 1;
      
      // Priority 3: Has ZIP code
      if (a.zip && !b.zip) return -1;
      if (!a.zip && b.zip) return 1;
      
      // Priority 4: Shorter ZIP (main ZIP vs +4)
      if (a.zip && b.zip) {
        const aLen = a.zip.length;
        const bLen = b.zip.length;
        if (aLen < bLen) return -1;
        if (aLen > bLen) return 1;
      }
      
      return 0;
    });
    
    const bestCity = sorted[0];
    const toDelete = sorted.slice(1);
    
    keepCities.push(bestCity);
    deleteCities.push(...toDelete);
    
    console.log(`🔍 ${bestCity.city}, ${bestCity.state_or_province}: keeping 1 of ${duplicates.length} (ZIP: ${bestCity.zip}, KMA: ${bestCity.kma_code})`);
  }
  
  console.log(`\n📊 DEDUPLICATION PLAN:`);
  console.log(`  Keep: ${keepCities.length} cities`);
  console.log(`  Delete: ${deleteCities.length} duplicates`);
  console.log(`  Reduction: ${((deleteCities.length / allCities.length) * 100).toFixed(1)}%`);
  
  // Step 4: Show some examples before deletion
  console.log(`\n📋 EXAMPLES OF DUPLICATES TO DELETE:`);
  const examples = deleteCities.slice(0, 10);
  examples.forEach(city => {
    console.log(`  ❌ ${city.city}, ${city.state_or_province} (${city.zip}) - ID: ${city.id}`);
  });
  
  // Step 5: Confirm before deletion
  console.log(`\n⚠️  READY TO DELETE ${deleteCities.length} DUPLICATE CITIES`);
  console.log(`This will reduce the cities table from ${allCities.length} to ${keepCities.length} rows`);
  
  // Delete in batches to avoid timeout
  const batchSize = 100;
  let deleted = 0;
  
  for (let i = 0; i < deleteCities.length; i += batchSize) {
    const batch = deleteCities.slice(i, i + batchSize);
    const idsToDelete = batch.map(city => city.id);
    
    const { error: deleteError } = await supabase
      .from('cities')
      .delete()
      .in('id', idsToDelete);
    
    if (deleteError) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, deleteError);
      break;
    }
    
    deleted += batch.length;
    console.log(`✅ Deleted batch ${Math.floor(i / batchSize) + 1}: ${deleted}/${deleteCities.length} duplicates removed`);
  }
  
  // Step 6: Verify final count
  const { count: finalCount } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n🎉 DEDUPLICATION COMPLETE!`);
  console.log(`  Before: ${allCities.length} cities`);
  console.log(`  After: ${finalCount} cities`);
  console.log(`  Removed: ${allCities.length - finalCount} duplicates`);
  console.log(`  Space saved: ${((allCities.length - finalCount) / allCities.length * 100).toFixed(1)}%`);
}

deduplicateCities().catch(console.error);
