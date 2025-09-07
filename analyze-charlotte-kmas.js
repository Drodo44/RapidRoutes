import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { adminSupabase } from './utils/supabaseClient.js';

async function analyzeCharlotteKMAs() {
  try {
  
  console.log('🔍 ANALYZING Charlotte delivery market within 100 miles...');
  
  // Charlotte coordinates
  const charlotteLat = 35.2083;
  const charlotteLon = -80.8303;
  const radius = 100;
  
  // Calculate lat/lon bounds for 100 miles
  const latRange = radius / 69;
  const lonRange = radius / (69 * Math.cos(charlotteLat * Math.PI / 180));
  
  console.log(`📍 Charlotte: ${charlotteLat}, ${charlotteLon}`);
  console.log(`🌐 Search bounds: ±${latRange.toFixed(3)} lat, ±${lonRange.toFixed(3)} lon`);
  
  // Query ALL cities within 100 miles of Charlotte
  const { data: allCities, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, kma_code, kma_name, latitude, longitude')
    .gte('latitude', charlotteLat - latRange)
    .lte('latitude', charlotteLat + latRange)
    .gte('longitude', charlotteLon - lonRange)
    .lte('longitude', charlotteLon + lonRange)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('kma_code', 'is', null)
    .order('kma_code');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  // Calculate actual distances and group by KMA
  const kmaGroups = {};
  let totalCities = 0;
  
  allCities.forEach(city => {
    // Calculate distance using Haversine formula
    const lat1 = charlotteLat * Math.PI / 180;
    const lat2 = city.latitude * Math.PI / 180;
    const deltaLat = (city.latitude - charlotteLat) * Math.PI / 180;
    const deltaLon = (city.longitude - charlotteLon) * Math.PI / 180;
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = 3959 * c; // Earth radius in miles
    
    if (distance <= 100) {
      totalCities++;
      
      if (!kmaGroups[city.kma_code]) {
        kmaGroups[city.kma_code] = {
          name: city.kma_name,
          cities: [],
          states: new Set(),
          minDistance: Infinity,
          count: 0
        };
      }
      
      kmaGroups[city.kma_code].cities.push({
        city: city.city,
        state: city.state_or_province,
        distance: distance
      });
      kmaGroups[city.kma_code].states.add(city.state_or_province);
      kmaGroups[city.kma_code].minDistance = Math.min(kmaGroups[city.kma_code].minDistance, distance);
      kmaGroups[city.kma_code].count++;
    }
  });
  
  const kmaList = Object.entries(kmaGroups).sort(([a], [b]) => a.localeCompare(b));
  
  console.log(`\n📊 CHARLOTTE 100-MILE MARKET ANALYSIS:`);
  console.log(`   Total cities found: ${totalCities}`);
  console.log(`   Unique KMAs available: ${kmaList.length}`);
  
  console.log(`\n🎯 AVAILABLE DELIVERY KMAs:`);
  kmaList.forEach(([code, data]) => {
    const states = Array.from(data.states).join(', ');
    const closest = data.cities.sort((a, b) => a.distance - b.distance)[0];
    console.log(`   ${code}: ${data.name} (${data.count} cities in ${states})`);
    console.log(`      Closest: ${closest.city}, ${closest.state} at ${closest.distance.toFixed(1)} miles`);
  });
  
  if (kmaList.length >= 6) {
    console.log(`\n✅ PLENTY OF KMAs: ${kmaList.length} available, should get 6+ easily!`);
    console.log(`🔧 Issue is likely in the city selection or scoring algorithm`);
    
    // Show why only 3 were selected
    console.log(`\n🔍 WHY ONLY 3 KMAs SELECTED?`);
    console.log(`   Current selection: SC_GRE, VA_ROA, TN_KNO`);
    console.log(`   Missing opportunities from available KMAs above`);
  } else {
    console.log(`\n⚠️ LIMITED KMAs: Only ${kmaList.length} unique within 100 miles`);
  }
  
  } catch (error) {
    console.error('Error analyzing Charlotte KMAs:', error.message);
  }
}

analyzeCharlotteKMAs();
