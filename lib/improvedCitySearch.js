// lib/improvedCitySearch.js
import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { calculateDistance } from "./distanceCalculator.js";

// State groupings for regional prioritization
const STATE_GROUPS = {
  'NEW_ENGLAND': ['MA', 'NH', 'ME', 'VT', 'RI', 'CT'],
  'MID_ATLANTIC': ['NY', 'NJ', 'PA'],
  'SOUTHEAST': ['NC', 'SC', 'GA', 'FL', 'VA', 'WV'],
  'MIDWEST': ['OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO'],
  'SOUTH': ['TX', 'LA', 'AR', 'OK', 'TN', 'KY', 'MS', 'AL'],
  'WEST': ['CA', 'OR', 'WA', 'NV', 'AZ', 'UT', 'CO', 'NM', 'ID', 'MT', 'WY']
};

function getStateGroup(state) {
  for (const [group, states] of Object.entries(STATE_GROUPS)) {
    if (states.includes(state)) return group;
  }
  return 'OTHER';
}

function calculateStatePriority(cityState, destinationState) {
  // Same state = highest priority
  if (cityState === destinationState) return 0;
  
  // Same regional group = medium priority
  const cityGroup = getStateGroup(cityState);
  const destGroup = getStateGroup(destinationState);
  if (cityGroup === destGroup) return 1;
  
  // Different region = lowest priority
  return 2;
}

export async function findDiverseCities(originCity, radius = 75) {
  const MAX_RADIUS = 100; // Absolute maximum radius - never exceed this
  const INITIAL_RADIUS = 75; // Start with this radius
  const MIN_KMA_COUNT = 5;
  const RADIUS_INCREMENT = 25;
  
  const destinationState = originCity.state_or_province || originCity.state;
  
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
    
    // Filter and calculate weighted distance based on state proximity
    cities = foundCities
      .map(city => {
        const distance = calculateDistance(
          originCity.latitude,
          originCity.longitude,
          city.latitude,
          city.longitude
        );
        
        const cityState = city.state_or_province || city.state;
        const statePriority = calculateStatePriority(cityState, destinationState);
        
        // Weight distance by state priority:
        // Same state: no penalty
        // Same region: +20 mile penalty
        // Different region: +50 mile penalty
        const weightedDistance = distance + (statePriority * 25);
        
        return {
          ...city,
          distance,
          weightedDistance,
          statePriority
        };
      })
      .filter(city => city.distance <= currentRadius)
      .sort((a, b) => {
        // Sort by state priority first, then weighted distance
        if (a.statePriority !== b.statePriority) {
          return a.statePriority - b.statePriority;
        }
        return a.weightedDistance - b.weightedDistance;
      });
      
    // Update unique KMAs
    uniqueKMAs = new Set(cities.map(c => c.kma_code));
    
    if (uniqueKMAs.size < MIN_KMA_COUNT) {
      currentRadius += 25;
    }
  }
  
  // Prioritize KMA diversity in results, respecting state priority
  const kmaGroups = new Map();
  for (const city of cities) {
    if (!kmaGroups.has(city.kma_code)) {
      kmaGroups.set(city.kma_code, []);
    }
    kmaGroups.get(city.kma_code).push(city);
  }
  
  // Take best city from each KMA first, prioritizing same-state and regional cities
  const diverseCities = [];
  const usedKMAs = new Set();
  
  while (diverseCities.length < 10 && kmaGroups.size > 0) {
    let bestCity = null;
    let bestWeightedDistance = Infinity;
    let bestKMA = null;
    
    for (const [kma, cities] of kmaGroups.entries()) {
      if (cities.length === 0) continue;
      
      const city = cities[0];
      // Use weighted distance that includes state priority
      if (city.weightedDistance < bestWeightedDistance && !usedKMAs.has(kma)) {
        bestCity = city;
        bestWeightedDistance = city.weightedDistance;
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
  
  // Log state distribution for debugging
  const stateDistribution = {};
  for (const city of diverseCities) {
    const state = city.state_or_province || city.state;
    stateDistribution[state] = (stateDistribution[state] || 0) + 1;
  }
  console.log(`📍 State distribution in crawl cities:`, stateDistribution);
  console.log(`🎯 Destination state: ${destinationState}`);
  
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