// verify-kma-uniqueness.js
// Verifies strict KMA uniqueness in generated city pairs

import { createClient } from '@supabase/supabase-js';
import { findDatCompatibleCities } from './lib/datCityFinder.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function verifyKmaUniqueness() {
  try {
    // Test set of origin cities
    const testOrigins = [
      { city: 'Seaboard', state_or_province: 'NC' },
      { city: 'Mansfield', state_or_province: 'AR' },
      { city: 'Carrollton', state_or_province: 'TX' }
    ];

    console.log('🔍 Starting KMA uniqueness verification...\n');

    for (const origin of testOrigins) {
      // Get origin city details
      const { data: originCity, error: originError } = await supabase
        .from('cities')
        .select('*')
        .eq('city', origin.city)
        .eq('state_or_province', origin.state_or_province)
        .single();

      if (originError) {
        console.error(`Error fetching origin city ${origin.city}, ${origin.state_or_province}:`, originError);
        continue;
      }

      console.log(`Testing origin: ${originCity.city}, ${originCity.state_or_province} (KMA: ${originCity.kma_code})`);

      // Get compatible cities
      const compatibleCities = await findDatCompatibleCities(originCity);

      // Track KMAs to verify uniqueness
      const seenKmas = new Set([originCity.kma_code]);
      const kmaViolations = [];

      // Check each compatible city
      for (const city of compatibleCities) {
        if (seenKmas.has(city.kma_code)) {
          kmaViolations.push({
            city: city.city,
            state: city.state_or_province,
            kma: city.kma_code,
            distance: Math.round(city.distance)
          });
        } else {
          seenKmas.add(city.kma_code);
        }
      }

      // Report results
      console.log(`\nResults for ${originCity.city}, ${originCity.state_or_province}:`);
      console.log(`- Total compatible cities found: ${compatibleCities.length}`);
      console.log(`- Unique KMAs found: ${seenKmas.size - 1}`); // -1 to exclude origin KMA
      
      if (compatibleCities.length > 0) {
        console.log('\nFirst 5 compatible cities:');
        compatibleCities.slice(0, 5).forEach(city => {
          console.log(`  - ${city.city}, ${city.state_or_province} (KMA: ${city.kma_code}, ${Math.round(city.distance)}mi)`);
        });
      }

      if (kmaViolations.length > 0) {
        console.log('\n❌ KMA uniqueness violations found:');
        kmaViolations.forEach(v => {
          console.log(`  - ${v.city}, ${v.state} (KMA: ${v.kma}, ${v.distance}mi)`);
        });
      } else {
        console.log('\n✅ KMA uniqueness verified - all cities in different KMAs');
      }
      console.log('\n---\n');
    }

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifyKmaUniqueness();
