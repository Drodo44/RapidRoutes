// scripts/debug-kma-enrichment.js
import { FreightIntelligence } from '../lib/FreightIntelligence.js';
import { adminSupabase } from '../utils/supabaseClient.js';
import { advancedCityDiscovery } from '../lib/hereAdvancedServices.js';
import { findBestKMA } from '../lib/kmaAssignment.js';

async function debugKMAEnrichment() {
  console.log('🔍 Debugging KMA enrichment process...');
  
  const testPoint = {
    city: 'Riegelwood',
    state: 'NC',
    latitude: 34.3293,
    longitude: -78.2214
  };
  
  console.log('\n1. Checking Supabase cities...');
  const { data: supabaseCities } = await adminSupabase
    .from('cities')
    .select('*')
    .not('kma_code', 'is', null)
    .eq('here_verified', true);
    
  console.log(`Found ${supabaseCities.length} cities in Supabase`);
  const uniqueKMAs = new Set(supabaseCities.map(c => c.kma_code));
  console.log(`Unique KMAs in Supabase: ${Array.from(uniqueKMAs).join(', ')}`);
  
  console.log('\n2. Testing HERE.com discovery...');
  const hereCities = await advancedCityDiscovery(
    testPoint.latitude,
    testPoint.longitude,
    75 // miles
  );
  
  console.log(`Found ${hereCities.cities.length} cities via HERE.com`);
  
  console.log('\n3. Cross-referencing with KMAs...');
  for (const city of hereCities.cities.slice(0, 5)) { // Process first 5 for demo
    const kma = await findBestKMA(city.latitude, city.longitude);
    console.log(`${city.city}, ${city.state} → KMA: ${kma?.code || 'Not found'}`);
  }
  
  console.log('\n4. Checking city enrichment storage...');
  const { data: enrichedCities } = await adminSupabase
    .from('cities')
    .select('*')
    .eq('here_verified', true)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recently enriched cities:');
  enrichedCities.forEach(city => {
    console.log(`- ${city.city}, ${city.state_or_province}: KMA=${city.kma_code}, Verified=${city.here_verified}`);
  });
}

debugKMAEnrichment();