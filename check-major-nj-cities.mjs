// Check which major NJ cities exist and their coordinates
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAJOR_CITIES = [
  'Newark', 'Trenton', 'Camden', 'Jersey City', 'Paterson', 
  'Elizabeth', 'Edison', 'Clifton', 'Lakewood', 'Atlantic City'
];

console.log('=== CHECKING MAJOR NJ CITIES ===\n');

for (const cityName of MAJOR_CITIES) {
  const { data, error } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, kma_code, kma_name')
    .ilike('city', cityName)
    .eq('state_or_province', 'NJ');
  
  if (error) {
    console.error(`Error checking ${cityName}:`, error.message);
    continue;
  }
  
  if (!data || data.length === 0) {
    console.log(`❌ ${cityName} - NOT FOUND`);
  } else {
    data.forEach(city => {
      console.log(`✅ ${city.city} - ${city.kma_code} (${city.latitude}, ${city.longitude})`);
    });
  }
}

console.log('\n=== CHECKING DISTANCE FROM MILLVILLE ===\n');

// Millville coords: 39.4021, -75.0393
const millvilleLat = 39.4021;
const millvilleLon = -75.0393;

const { data: allNJ } = await supabase
  .from('cities')
  .select('city, latitude, longitude, kma_code')
  .eq('state_or_province', 'NJ')
  .not('kma_code', 'is', null)
  .not('latitude', 'is', null)
  .not('longitude', 'is', null);

// Calculate distances
const withDistance = allNJ.map(city => {
  const lat1 = millvilleLat * Math.PI / 180;
  const lat2 = city.latitude * Math.PI / 180;
  const dLat = (city.latitude - millvilleLat) * Math.PI / 180;
  const dLon = (city.longitude - millvilleLon) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = 3959 * c; // miles
  
  return { ...city, distance };
}).sort((a, b) => a.distance - b.distance);

console.log('Closest 20 NJ cities to Millville:');
withDistance.slice(0, 20).forEach((city, i) => {
  console.log(`${i+1}. ${city.city} (${city.kma_code}) - ${city.distance.toFixed(1)} miles`);
});

// Check major cities specifically
console.log('\n=== MAJOR CITIES DISTANCE FROM MILLVILLE ===\n');
MAJOR_CITIES.forEach(majorCity => {
  const found = withDistance.find(c => c.city.toLowerCase() === majorCity.toLowerCase());
  if (found) {
    console.log(`${found.city}: ${found.distance.toFixed(1)} miles (${found.kma_code})`);
  } else {
    console.log(`${majorCity}: NOT FOUND`);
  }
});
