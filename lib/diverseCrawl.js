// lib/diverseCrawl.js
// KMA-INTELLIGENT: Different freight markets for maximum reach
import { adminSupabase } from '../utils/supabaseAdminClient.js';

// Global KMA tracking to ensure freight market diversity
let USED_KMAS = new Set();
let KMA_CITY_MAP = null;

/**
 * Load cities grouped by KMA for freight intelligence
 */
async function getKmaCityMap() {
  if (!KMA_CITY_MAP) {
    console.log('�️ Loading KMA city map for freight intelligence...');
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .not('kma_code', 'is', null)
      .not('latitude', 'is', null)
      .order('city', { ascending: true });
    
    if (!allCities?.length) {
      throw new Error('No KMA cities found in database');
    }
    
    // Group cities by KMA
    KMA_CITY_MAP = {};
    allCities.forEach(city => {
      const kma = city.kma_code;
      if (!KMA_CITY_MAP[kma]) {
        KMA_CITY_MAP[kma] = [];
      }
      KMA_CITY_MAP[kma].push({
        city: city.city,
        state: city.state_or_province,
        zip: city.zip || '',
        kma_code: city.kma_code,
        kma_name: city.kma_name
      });
    });
    
    const kmaCount = Object.keys(KMA_CITY_MAP).length;
    console.log(`✅ Loaded ${kmaCount} KMAs with cities for freight diversity`);
  }
  
  return KMA_CITY_MAP;
}

/**
 * Get city from a DIFFERENT KMA than already used
 */
  function getCityFromUnusedKma(kmaMap, usedKmas, requiredUnique = 6, attempts = 0) {
    const availableKmas = Object.keys(kmaMap).filter(kma => !usedKmas.has(kma));
    const maxAttempts = 3;
    
    if (availableKmas.length === 0) {
      // CRITICAL FIX: DO NOT clear used KMAs - this violates uniqueness enforcement
      // Instead, fail gracefully when KMA diversity is exhausted
      const totalKmasAvailable = Object.keys(kmaMap).length;
      const kmasAlreadyUsed = usedKmas.size;
      
      throw new Error(
        `KMA UNIQUENESS EXHAUSTED: No more unique KMAs available for generation.\n` +
        `Total KMAs in database: ${totalKmasAvailable}\n` +
        `KMAs already used: ${kmasAlreadyUsed}\n` +
        `Available KMAs remaining: 0\n` +
        `This is the natural stopping point - cannot generate more pairs without violating KMA uniqueness.`
      );
    }
    
    // FREIGHT INTELLIGENCE: Major metros to AVOID unless specifically justified
    const majorMetros = new Set([
      'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia',
      'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville',
      'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis',
      'Seattle', 'Denver', 'Washington', 'Boston', 'Nashville', 'Baltimore',
      'Oklahoma City', 'Louisville', 'Portland', 'Las Vegas', 'Milwaukee',
      'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Kansas City', 'Mesa',
      'Atlanta', 'Omaha', 'Colorado Springs', 'Raleigh', 'Virginia Beach',
      'Long Beach', 'Miami', 'Oakland', 'Minneapolis', 'Tampa', 'Tulsa',
      'Arlington', 'New Orleans', 'Wichita', 'Cleveland', 'Bakersfield'
    ]);
    
    // FREIGHT INTELLIGENCE: Hidden gem criteria for selection priority
    const isFreightGem = (city) => {
      const cityName = city.city?.toLowerCase() || '';
      
      // Industrial/logistics indicators
      const industrialKeywords = [
        'industrial', 'logistics', 'distribution', 'freight', 'terminal',
        'port', 'junction', 'crossing', 'yard', 'hub', 'center'
      ];
      
      // Agricultural/manufacturing indicators
      const freightKeywords = [
        'mill', 'plant', 'works', 'field', 'grove', 'ranch', 'valley',
        'junction', 'crossing', 'station', 'depot', 'terminal'
      ];
      
      // Known freight corridor cities (hidden gems)
      const knownGems = [
        'joliet', 'salinas', 'ontario', 'fontana', 'riverside', 'moreno valley',
        'victorville', 'barstow', 'bakersfield', 'fresno', 'stockton', 'modesto',
        'tracy', 'manteca', 'turlock', 'merced', 'visalia', 'tulare', 'delano',
        'wasco', 'shafter', 'madera', 'chowchilla', 'los banos', 'newman',
        'patterson', 'gustine', 'livingston', 'atwater', 'winton', 'ceres',
        'keyes', 'hughson', 'waterford', 'oakdale', 'riverbank', 'escalon',
        'ripon', 'lathrop', 'french camp', 'woodbridge'
      ];
      
      const hasIndustrial = industrialKeywords.some(kw => cityName.includes(kw));
      const hasFreight = freightKeywords.some(kw => cityName.includes(kw));
      const isKnownGem = knownGems.some(gem => cityName.includes(gem));
      
      return hasIndustrial || hasFreight || isKnownGem;
    };
    
    // Strategic KMA selection prioritizing freight intelligence
    let selectedKma;
    let attempts_gem = 0;
    const max_gem_attempts = 3;
    
    // First, try to find a KMA with freight-intelligent cities
    while (attempts_gem < max_gem_attempts) {
      const kma = availableKmas[Math.floor(Math.random() * availableKmas.length)];
      const cities = kmaMap[kma];
      
      if (cities?.some(city => isFreightGem(city))) {
        selectedKma = kma;
        console.log(`💎 Found freight gem KMA: ${kma}`);
        break;
      }
      attempts_gem++;
    }
    
    // If no freight gem KMA found, use any available KMA
    if (!selectedKma) {
      selectedKma = availableKmas[Math.floor(Math.random() * availableKmas.length)];
      console.log(`📍 Using standard KMA: ${selectedKma}`);
    }
    
    const cities = kmaMap[selectedKma];
    if (!cities?.length) {
      throw new Error(`No cities found for KMA: ${selectedKma}`);
    }
    
    // CITY SELECTION: Prioritize freight gems, avoid major metros
    let selectedCity;
    
    // 1. Try to find a freight gem city (prioritize)
    const freightGems = cities.filter(city => 
      isFreightGem(city) && !majorMetros.has(city.city)
    );
    
    if (freightGems.length > 0) {
      selectedCity = freightGems[Math.floor(Math.random() * freightGems.length)];
      console.log(`💎 FREIGHT GEM selected: ${selectedCity.city}, ${selectedCity.state}`);
    } else {
      // 2. If no gems, avoid major metros at least
      const nonMetros = cities.filter(city => !majorMetros.has(city.city));
      
      if (nonMetros.length > 0) {
        selectedCity = nonMetros[Math.floor(Math.random() * nonMetros.length)];
        console.log(`🏭 Non-metro selected: ${selectedCity.city}, ${selectedCity.state}`);
      } else {
        // 3. Last resort: use any city (including metros if necessary)
        selectedCity = cities[Math.floor(Math.random() * cities.length)];
        console.log(`🏙️ Metro fallback: ${selectedCity.city}, ${selectedCity.state}`);
      }
    }
    
    // Mark KMA as used
    usedKmas.add(selectedKma);
    
    console.log(`📍 Selected: ${selectedCity.city}, ${selectedCity.state} (KMA: ${selectedKma} - ${selectedCity.kma_name})`);
    console.log(`   KMAs used: ${usedKmas.size}/${requiredUnique} required`);
    
    return selectedCity;
  }

/**
 * Generate KMA-diverse crawl pairs for maximum freight coverage
 */
export async function generateDiverseCrawlPairs({ 
  origin, 
  destination, 
  equipment, 
  preferFillTo10, 
  usedCities = new Set() 
}) {
  try {
    const kmaMap = await getKmaCityMap();
    
    console.log(`�️ KMA-INTELLIGENT CRAWL: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
    
    // Get base cities with ZIP codes and KMA info
    const { data: originCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);
    
    const { data: destCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .limit(1);
    
    const baseOrigin = originCities?.[0] ? {
      city: originCities[0].city,
      state: originCities[0].state_or_province,
      zip: originCities[0].zip || '',
      kma_code: originCities[0].kma_code
    } : { city: origin.city, state: origin.state, zip: '', kma_code: null };
    
    const baseDest = destCities?.[0] ? {
      city: destCities[0].city,
      state: destCities[0].state_or_province,
      zip: destCities[0].zip || '',
      kma_code: destCities[0].kma_code
    } : { city: destination.city, state: destination.state, zip: '', kma_code: null };
    
    // Separate tracking for pickup and delivery KMAs
    const pickupKmas = new Set();
    const deliveryKmas = new Set();
    
    // Mark base KMAs as used if they exist
    if (baseOrigin.kma_code) pickupKmas.add(baseOrigin.kma_code);
    if (baseDest.kma_code) deliveryKmas.add(baseDest.kma_code);
    
    // Generate minimum 6 pairs (1 original + 5+ intelligent) with NO MAXIMUM
    // Continue generating as long as unique KMAs are available and freight-intelligent
    const pairs = [];
    const MINIMUM_PAIRS = 6; // Minimum required (1 original + 5 intelligent)
    
    // Generate pairs until we can no longer find unique KMAs or reach reasonable limit
    while (true) {
      try {
        const pickup = getCityFromUnusedKma(kmaMap, pickupKmas, MINIMUM_PAIRS);
        const delivery = getCityFromUnusedKma(kmaMap, deliveryKmas, MINIMUM_PAIRS);
      
        pairs.push({
          pickup: {
            city: pickup.city,
            state: pickup.state,
            zip: pickup.zip,
            kma_code: pickup.kma_code,
            kma_name: pickup.kma_name
          },
          delivery: {
            city: delivery.city,
            state: delivery.state,
            zip: delivery.zip,
            kma_code: delivery.kma_code,
            kma_name: delivery.kma_name
          },
          score: 1.0 // Perfect score for validated KMA diversity
        });
        
      } catch (kmaError) {
        // No more unique KMAs available - this is the natural stopping point
        console.log(`🛑 KMA uniqueness limit reached after ${pairs.length} pairs`);
        console.log(`   Reason: ${kmaError.message}`);
        break;
      }
    }
    
    // Validate we generated at least the minimum required pairs
    if (pairs.length < MINIMUM_PAIRS) {
      throw new Error(`Failed to generate minimum ${MINIMUM_PAIRS} pairs. Generated: ${pairs.length}. Need more KMA diversity in database.`);
    }
    
    console.log(`✅ Generated ${pairs.length} intelligent pairs (minimum ${MINIMUM_PAIRS}, no maximum):`);
    console.log(`   Pickup KMAs (${pickupKmas.size}): ${Array.from(pickupKmas).join(', ')}`);
    console.log(`   Delivery KMAs (${deliveryKmas.size}): ${Array.from(deliveryKmas).join(', ')}`);
    console.log(`   Total pairings: ${pairs.length + 1} (1 original + ${pairs.length} generated)`);  console.log(`📋 Generated ${pairs.length} new pairs (${pairs.length + 1} total including original):`);
  pairs.forEach((pair, i) => {
    console.log(`  PAIR ${i+1}: ${pair.pickup.city}, ${pair.pickup.state} (${pair.pickup.kma_code}) -> ${pair.delivery.city}, ${pair.delivery.state} (${pair.delivery.kma_code})`);
  });    return { baseOrigin, baseDest, pairs };
    
  } catch (error) {
    console.error('KMA-diverse crawl error:', error);
    return { 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: [] 
    };
  }
}
