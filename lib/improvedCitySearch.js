// lib/improvedCitySearch.js
import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { calculateDistance } from "./distanceCalculator.js";

export async function findDiverseCities(originCity, radius = 75) {
  const MAX_RADIUS = 100; // Absolute maximum radius - never exceed this
    const INITIAL_RADIUS = 75; // Start with this radius // Hard limit: Never exceed 100 miles
  const MIN_KMA_COUNT = 5;
  const RADIUS_INCREMENT = 25;
  
  let currentRadius = INITIAL_RADIUS;
  let cities = [];
  let uniqueKMAs = new Set();
  
  // Try up to max radius or until we have enough KMAs
  while (currentRadius <= MAX_RADIUS && uniqueKMAs.size < MIN_KMA_COUNT) {
    console.log(`🔍 Searching within ${currentRadius} miles radius...`);
    
    const { data: foundCities } = await supabaseAdmin
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .eq('here_verified', true);
      
    if (!foundCities?.length) {
      // Stop if we'd exceed max radius
      if (currentRadius + RADIUS_INCREMENT > MAX_RADIUS) break;
      currentRadius += RADIUS_INCREMENT;
      continue;
    }
    
    // Filter and sort by distance
    cities = foundCities
      .map(city => ({
        ...city,
        distance: calculateDistance(
          originCity.latitude,
          originCity.longitude,
          city.latitude,
          city.longitude
        )
      }))
      .filter(city => city.distance <= currentRadius)
      .sort((a, b) => a.distance - b.distance);
      
    // Update unique KMAs
    uniqueKMAs = new Set(cities.map(c => c.kma_code));
    
    if (uniqueKMAs.size < MIN_KMA_COUNT) {
      currentRadius += 25;
    }
  }
  
  // Prioritize KMA diversity in results
  const kmaGroups = new Map();
  for (const city of cities) {
    if (!kmaGroups.has(city.kma_code)) {
      kmaGroups.set(city.kma_code, []);
    }
    kmaGroups.get(city.kma_code).push(city);
  }
  
  // Take closest city from each KMA first
  const diverseCities = [];
  const usedKMAs = new Set();
  
  while (diverseCities.length < 10 && kmaGroups.size > 0) {
    let bestCity = null;
    let bestDistance = Infinity;
    let bestKMA = null;
    
    for (const [kma, cities] of kmaGroups.entries()) {
      if (cities.length === 0) continue;
      
      const city = cities[0];
      if (city.distance < bestDistance && !usedKMAs.has(kma)) {
        bestCity = city;
        bestDistance = city.distance;
        bestKMA = kma;
      }
    }
    
    if (!bestCity) break;
    
    diverseCities.push(bestCity);
    usedKMAs.add(bestKMA);
    kmaGroups.get(bestKMA).shift();
    
    if (kmaGroups.get(bestKMA).length === 0) {
      kmaGroups.delete(bestKMA);
    }
  }
  
  // Return results with metadata
  return {
    cities,
    metadata: {
      searchRadius: Math.min(currentRadius, MAX_RADIUS), // Never report over MAX_RADIUS
      uniqueKMACount: uniqueKMAs.size,
      totalCities: cities.length,
      averageDistance: Math.round(cities.reduce((sum, c) => sum + c.distance, 0) / cities.length),
      timestamp: new Date().toISOString()
    }
  };
}