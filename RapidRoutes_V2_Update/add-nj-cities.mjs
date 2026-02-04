// add-nj-cities.mjs
// Add major New Jersey cities - critical freight corridor

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Major NJ cities with coordinates
const NJ_CITIES = [
  { city: 'Newark', lat: 40.7357, lon: -74.1724, kma: 'NJ_NEW' },
  { city: 'Jersey City', lat: 40.7178, lon: -74.0431, kma: 'NJ_NEW' },
  { city: 'Paterson', lat: 40.9168, lon: -74.1718, kma: 'NJ_NEW' },
  { city: 'Elizabeth', lat: 40.6640, lon: -74.2107, kma: 'NJ_NEW' },
  { city: 'Edison', lat: 40.5187, lon: -74.4121, kma: 'NJ_NEW' },
  { city: 'Woodbridge', lat: 40.5576, lon: -74.2846, kma: 'NJ_NEW' },
  { city: 'Lakewood', lat: 40.0979, lon: -74.2179, kma: 'NJ_TRE' },
  { city: 'Toms River', lat: 39.9537, lon: -74.1979, kma: 'NJ_TRE' },
  { city: 'Hamilton', lat: 40.2298, lon: -74.6738, kma: 'NJ_TRE' },
  { city: 'Trenton', lat: 40.2171, lon: -74.7429, kma: 'NJ_TRE' },
  { city: 'Clifton', lat: 40.8584, lon: -74.1638, kma: 'NJ_NEW' },
  { city: 'Camden', lat: 39.9259, lon: -75.1196, kma: 'PA_PHI' },
  { city: 'Brick', lat: 40.0662, lon: -74.1043, kma: 'NJ_TRE' },
  { city: 'Cherry Hill', lat: 39.9350, lon: -75.0307, kma: 'PA_PHI' },
  { city: 'Passaic', lat: 40.8568, lon: -74.1285, kma: 'NJ_NEW' },
  { city: 'Union City', lat: 40.6976, lon: -74.0243, kma: 'NJ_NEW' },
  { city: 'Bayonne', lat: 40.6687, lon: -74.1143, kma: 'NJ_NEW' },
  { city: 'East Orange', lat: 40.7673, lon: -74.2049, kma: 'NJ_NEW' },
  { city: 'Vineland', lat: 39.4864, lon: -75.0257, kma: 'NJ_ATL' },
  { city: 'New Brunswick', lat: 40.4862, lon: -74.4518, kma: 'NJ_NEW' },
  { city: 'Hoboken', lat: 40.7439, lon: -74.0324, kma: 'NJ_NEW' },
  { city: 'Perth Amboy', lat: 40.5067, lon: -74.2654, kma: 'NJ_NEW' },
  { city: 'West New York', lat: 40.7879, lon: -74.0143, kma: 'NJ_NEW' },
  { city: 'Plainfield', lat: 40.6337, lon: -74.4074, kma: 'NJ_NEW' },
  { city: 'Hackensack', lat: 40.8859, lon: -74.0435, kma: 'NJ_NEW' },
  { city: 'Sayreville', lat: 40.4593, lon: -74.3610, kma: 'NJ_NEW' },
  { city: 'Kearny', lat: 40.7684, lon: -74.1454, kma: 'NJ_NEW' },
  { city: 'Linden', lat: 40.6220, lon: -74.2446, kma: 'NJ_NEW' },
  { city: 'Atlantic City', lat: 39.3643, lon: -74.4229, kma: 'NJ_ATL' },
];

async function addNJCities() {
  console.log('=== ADDING NEW JERSEY CITIES ===\n');
  console.log(`Total cities to add: ${NJ_CITIES.length}\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const cityData of NJ_CITIES) {
    const { city, lat, lon, kma } = cityData;
    
    console.log(`Processing: ${city}, NJ`);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .ilike('city', city)
      .eq('state_or_province', 'NJ')
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ✓ Already exists`);
      skipped++;
      continue;
    }
    
    // Insert
    const { error } = await supabase
      .from('cities')
      .insert({
        city: city,
        state_or_province: 'NJ',
        latitude: lat,
        longitude: lon,
        kma_code: kma,
        zip: null
      });
    
    if (error) {
      console.error(`  ❌ Error:`, error.message);
      errors++;
    } else {
      console.log(`  ✅ Added (${kma})`);
      added++;
    }
    
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Added: ${added}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total NJ cities now: ${added + skipped}`);
}

addNJCities().catch(console.error);
