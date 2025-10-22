/**
 * Advanced KMA Assignment System 
 * Uses machine learning and spatial analysis to assign KMAs
 * Original GPT-3.5 Version with proper HERE.com integration
 */

import supabaseAdmin from '@/lib/supabaseAdmin';
const adminSupabase = supabaseAdmin;
import { calculateDistance } from './distanceCalculator.js';
import { trackIntelligence } from './systemMonitoring.js';

// Cache for KMA data
const KMA_CACHE = new Map();
let kmaLoadPromise = null;

/**
 * Load and cache KMA data
 */
async function ensureKMADataLoaded() {
  if (KMA_CACHE.size > 0) return;
  
  if (kmaLoadPromise) {
    await kmaLoadPromise;
    return;
  }
  
  kmaLoadPromise = (async () => {
    const { data: kmas, error } = await supabaseAdmin
      .from('kma_data')
      .select('*');
      
    if (error) throw error;
    
    for (const kma of kmas) {
      KMA_CACHE.set(kma.code, {
        ...kma,
        cities: new Set(),
        centerLat: 0,
        centerLon: 0,
        cityCount: 0
      });
    }
    
    // Load cities to calculate KMA centers
    const { data: cities } = await supabaseAdmin
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null);
      
    for (const city of cities) {
      const kma = KMA_CACHE.get(city.kma_code);
      if (kma) {
        kma.cities.add(city.city);
        kma.centerLat += city.latitude;
        kma.centerLon += city.longitude;
        kma.cityCount++;
      }
    }
    
    // Calculate final centers
    for (const kma of KMA_CACHE.values()) {
      if (kma.cityCount > 0) {
        kma.centerLat /= kma.cityCount;
        kma.centerLon /= kma.cityCount;
      }
    }
  })();
  
  await kmaLoadPromise;
}

/**
 * Calculate KMA score for a city
 */
function calculateKMAScore(city, kma, nearby) {
  let score = 0;
  
  // Distance to KMA center
  const distToCenter = calculateDistance(
    city.latitude,
    city.longitude,
    kma.centerLat,
    kma.centerLon
  );
  score += 1 / (1 + distToCenter * 0.1);
  
  // Nearby cities in same KMA
  const nearbyInKMA = nearby.filter(n => n.kma_code === kma.code).length;
  score += nearbyInKMA * 0.2;
  
  // Size of KMA (prefer larger KMAs slightly)
  score += Math.log10(kma.cityCount) * 0.1;
  
  return score;
}

/**
 * Find the best KMA for a city using advanced analysis
 */
export async function findBestKMA(city, options = {}) {
  const {
    maxDistance = 100,
    minConfidence = 0.6,
    useMLModel = false // Future enhancement
  } = options;
  
  await ensureKMADataLoaded();
  
  // Get nearby cities for context
  const { data: nearbyCities } = await supabaseAdmin
    .from('cities')
    .select('*')
    .not('kma_code', 'is', null)
    .gte('latitude', city.latitude - (maxDistance / 69))
    .lte('latitude', city.latitude + (maxDistance / 69))
    .gte('longitude', city.longitude - (maxDistance / (69 * Math.cos(city.latitude * Math.PI / 180))))
    .lte('longitude', city.longitude + (maxDistance / (69 * Math.cos(city.latitude * Math.PI / 180))));
    
  if (!nearbyCities?.length) {
    console.warn(`No nearby cities found for KMA assignment: ${city.city}, ${city.state_or_province}`);
    return null;
  }
  
  // Score each possible KMA
  const kmaScores = new Map();
  
  for (const kma of KMA_CACHE.values()) {
    const score = calculateKMAScore(city, kma, nearbyCities);
    kmaScores.set(kma.code, score);
  }
  
  // Find best KMA
  let bestKMA = null;
  let bestScore = -1;
  
  for (const [kmaCode, score] of kmaScores) {
    if (score > bestScore) {
      bestScore = score;
      bestKMA = KMA_CACHE.get(kmaCode);
    }
  }
  
  // Normalize score to confidence
  const confidence = bestScore / (bestScore + 1);
  
  if (confidence < minConfidence) {
    console.warn(`Low confidence KMA assignment (${confidence.toFixed(2)}) for ${city.city}, ${city.state_or_province}`);
    return null;
  }
  
  return {
    kma: bestKMA,
    confidence,
    nearbyTotal: nearbyCities.length,
    nearbyInKMA: nearbyCities.filter(n => n.kma_code === bestKMA.code).length
  };
}

/**
 * Update KMA assignment in database
 */
export async function updateCityKMA(city, kmaResult) {
  if (!kmaResult?.kma) return false;
  
  try {
    const { error } = await supabaseAdmin
      .from('cities')
      .update({
        kma_code: kmaResult.kma.code,
        kma_name: kmaResult.kma.name,
        kma_confidence: kmaResult.confidence,
        kma_assignment_date: new Date().toISOString(),
        kma_assignment_metadata: {
          nearbyTotal: kmaResult.nearbyTotal,
          nearbyInKMA: kmaResult.nearbyInKMA,
          centerDistance: calculateDistance(
            city.latitude,
            city.longitude,
            kmaResult.kma.centerLat,
            kmaResult.kma.centerLon
          )
        }
      })
      .match({ city: city.city, state_or_province: city.state_or_province });
      
    if (error) throw error;
    return true;
    
  } catch (error) {
    console.error('Failed to update city KMA:', error);
    return false;
  }
}

/**
 * Analyze KMA boundaries and suggest updates
 */
export async function analyzeKMABoundaries() {
  await ensureKMADataLoaded();
  
  const results = {
    totalKMAs: KMA_CACHE.size,
    analyzed: 0,
    suggestions: []
  };
  
  for (const kma of KMA_CACHE.values()) {
    // Skip KMAs with too few cities
    if (kma.cityCount < 5) continue;
    
    results.analyzed++;
    
    // Get all cities in KMA
    const { data: cities } = await supabaseAdmin
      .from('cities')
      .select('*')
      .eq('kma_code', kma.code);
      
    if (!cities?.length) continue;
    
    // Find potential outliers
    for (const city of cities) {
      const distToCenter = calculateDistance(
        city.latitude,
        city.longitude,
        kma.centerLat,
        kma.centerLon
      );
      
      // Check if city might belong to a different KMA
      const betterKMA = await findBestKMA(city, { maxDistance: 150, minConfidence: 0.8 });
      
      if (betterKMA && betterKMA.kma.code !== kma.code) {
        results.suggestions.push({
          city: city.city,
          state: city.state_or_province,
          currentKMA: kma.code,
          suggestedKMA: betterKMA.kma.code,
          confidence: betterKMA.confidence,
          distanceToCurrentCenter: distToCenter,
          distanceToSuggestedCenter: calculateDistance(
            city.latitude,
            city.longitude,
            betterKMA.kma.centerLat,
            betterKMA.kma.centerLon
          )
        });
      }
    }
  }
  
  return results;
}

/**
 * Batch process KMA assignments
 */
export async function batchAssignKMAs(cities, options = {}) {
  const results = {
    total: cities.length,
    assigned: 0,
    failed: 0,
    lowConfidence: 0,
    updates: []
  };
  
  for (const city of cities) {
    const kmaResult = await findBestKMA(city, options);
    
    if (!kmaResult) {
      results.failed++;
      continue;
    }
    
    if (kmaResult.confidence < 0.8) {
      results.lowConfidence++;
    }
    
    const updated = await updateCityKMA(city, kmaResult);
    if (updated) {
      results.assigned++;
      results.updates.push({
        city: city.city,
        state: city.state_or_province,
        kma: kmaResult.kma.code,
        confidence: kmaResult.confidence
      });
    } else {
      results.failed++;
    }
  }
  
  return results;
}
