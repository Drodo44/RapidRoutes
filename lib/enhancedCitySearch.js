// lib/enhancedCitySearch.js
import { adminSupabase } from "../utils/supabaseClient.js";
import { calculateDistance } from "./distanceCalculator.js";

// Strategic KMA groupings for better diversity
const KMA_REGIONS = {
  NORTHEAST: ['NY_ALB', 'NY_BUF', 'NY_SYR', 'PA_HAR', 'PA_PHI', 'PA_PIT'],
  MIDATLANTIC: ['MD_BAL', 'VA_NOR', 'VA_RCH', 'VA_ROA', 'VA_WIN', 'WV_CHA'],
  SOUTHEAST: ['NC_CHA', 'NC_GRE', 'NC_RAL', 'NC_WIL', 'SC_COL', 'GA_ATL'],
  MIDWEST: ['OH_CLE', 'OH_COL', 'OH_DAY', 'IN_FTW', 'IN_IND', 'MI_DET'],
  SOUTHWEST: ['TX_DAL', 'TX_HOU', 'TX_SAT', 'OK_OKC', 'AR_LIT', 'LA_SHR']
};

// Secondary KMA connections for expanded search
const KMA_CONNECTIONS = {
  'PA_HAR': ['PA_PHI', 'PA_PIT', 'MD_BAL'],
  'OH_CLE': ['OH_COL', 'PA_PIT', 'MI_DET'],
  'NC_CHA': ['NC_GRE', 'SC_COL', 'VA_ROA'],
  // Add more connections based on geographical proximity
};

export async function findDiverseCitiesEnhanced(originCity, options = {}) {
  const {
    initialRadius = 75,
    maxRadius = 100,
    minKMACount = 5,
    useSecondaryKMAs = true,
    radiusIncrement = 15
  } = options;

  let currentRadius = initialRadius;
  let cities = [];
  let uniqueKMAs = new Set();
  let secondaryKMAs = new Set();

  // Initial city search
  while (currentRadius <= maxRadius) {
    console.log(`🔍 Searching within ${currentRadius} miles radius...`);
    
    const { data: foundCities, error } = await adminSupabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .eq('here_verified', true);

    if (error) throw error;
    
    if (!foundCities?.length) {
      currentRadius = Math.min(currentRadius + radiusIncrement, maxRadius);
      continue;
    }

    // Process and filter cities
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

    // Update KMA sets
    cities.forEach(city => {
      uniqueKMAs.add(city.kma_code);
      
      // Add connected KMAs if enabled
      if (useSecondaryKMAs && KMA_CONNECTIONS[city.kma_code]) {
        KMA_CONNECTIONS[city.kma_code].forEach(kma => secondaryKMAs.add(kma));
      }
    });

    // Check if we have enough KMAs (including strategic connections)
    if (uniqueKMAs.size >= minKMACount) {
      break;
    }

    // Try to find cities in connected KMAs
    if (useSecondaryKMAs && secondaryKMAs.size > 0) {
      const secondarySearch = await adminSupabase
        .from('cities')
        .select('*')
        .in('kma_code', Array.from(secondaryKMAs))
        .eq('here_verified', true);

      if (!secondarySearch.error && secondarySearch.data) {
        const additionalCities = secondarySearch.data
          .map(city => ({
            ...city,
            distance: calculateDistance(
              originCity.latitude,
              originCity.longitude,
              city.latitude,
              city.longitude
            )
          }))
          .filter(city => city.distance <= currentRadius);

        // Add new cities that increase KMA diversity
        additionalCities.forEach(city => {
          if (!cities.find(c => c.city === city.city) && city.distance <= currentRadius) {
            cities.push(city);
            uniqueKMAs.add(city.kma_code);
          }
        });

        // Resort by distance
        cities.sort((a, b) => a.distance - b.distance);
      }
    }

    if (uniqueKMAs.size >= minKMACount) {
      break;
    }

    // Increment radius if we haven't found enough KMAs
    currentRadius = Math.min(currentRadius + radiusIncrement, maxRadius);
  }

  // Optimize final city selection for maximum KMA diversity
  const optimizedCities = [];
  const includedKMAs = new Set();
  
  // First pass: Include closest city from each unique KMA
  cities.forEach(city => {
    if (!includedKMAs.has(city.kma_code)) {
      optimizedCities.push(city);
      includedKMAs.add(city.kma_code);
    }
  });

  // Second pass: Add remaining cities that are within distance and maintain diversity
  cities.forEach(city => {
    if (!optimizedCities.includes(city) && 
        city.distance <= currentRadius &&
        !optimizedCities.some(c => c.city === city.city)) {
      optimizedCities.push(city);
    }
  });

  // Sort final results by distance
  optimizedCities.sort((a, b) => a.distance - b.distance);

  return {
    cities: optimizedCities,
    metadata: {
      searchRadius: currentRadius,
      uniqueKMACount: uniqueKMAs.size,
      totalCities: optimizedCities.length,
      averageDistance: Math.round(
        optimizedCities.reduce((sum, c) => sum + c.distance, 0) / optimizedCities.length
      ),
      secondaryKMAsFound: secondaryKMAs.size,
      timestamp: new Date().toISOString()
    }
  };
}