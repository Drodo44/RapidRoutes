/**
 * INTELLIGENT LEARNING SYSTEM
 * 
 * This system uses HERE.com API to:
 * 1. Find additional cities within 75-100 miles that Supabase database missed
 * 2. Add discovered cities to the database for future use
 * 3. Expand KMA coverage by finding cities in different freight zones
 * 4. Continuously learn and improve the database quality
 * 
 * The goal: Turn each lane generation into a learning opportunity
 * Result: Database becomes more intelligent over time
 */

import { verifyCityWithHERE, generateAlternativeCitiesWithHERE } from './hereVerificationService.js';
import { adminSupabase as supabase } from '../utils/supabaseClient.js';

/**
 * Discover additional cities using HERE.com and teach the database
 */
export async function discoverAndLearnCities(baseCity, radiusMiles = 100, type = 'pickup') {
  console.log(`🧠 LEARNING MODE: Discovering additional ${type} cities near ${baseCity.city}, ${baseCity.state}`);
  
  if (!baseCity.latitude || !baseCity.longitude) {
    console.warn(`⚠️ No coordinates for ${baseCity.city}, ${baseCity.state} - cannot discover nearby cities`);
    return [];
  }
  
  try {
    // Use HERE.com to find cities within the radius
    const hereCities = await generateAlternativeCitiesWithHERE(
      baseCity.latitude, 
      baseCity.longitude, 
      radiusMiles, 
      50 // Get more results for learning
    );
    
    if (!hereCities || hereCities.length === 0) {
      console.log(`📍 HERE.com found no additional cities near ${baseCity.city}, ${baseCity.state}`);
      return [];
    }
    
    console.log(`🔍 HERE.com discovered ${hereCities.length} potential cities near ${baseCity.city}, ${baseCity.state}`);
    
    // Check which cities are NOT in our database
    const newCities = [];
    // FREIGHT INTELLIGENT ANALYSIS: Check current KMA coverage before learning
    const currentKMACoverage = await analyzeCurrentKMACoverage(baseCity, type);
    console.log(`🗺️ CURRENT KMA COVERAGE for ${type} near ${baseCity.city}, ${baseCity.state}:`);
    console.log(`   📊 KMAs in database: ${currentKMACoverage.kmaCodes.size}`);
    console.log(`   🎯 KMA diversity score: ${currentKMACoverage.diversityScore}`);
    
    const learningStats = {
      hereCitiesFound: hereCities.length,
      alreadyInDatabase: 0,
      newCitiesDiscovered: 0,
      addedToDatabase: 0,
      newKMAsDiscovered: new Set(),
      kmaGapsFilled: 0,
      duplicateKMAsRejected: 0
    };
    
    for (const hereCity of hereCities) {
      // Check if this city is already in our database
      const { data: existingCity } = await supabase
        .from('cities')
        .select('city, state_or_province, kma_code')
        .ilike('city', hereCity.city)
        .ilike('state_or_province', hereCity.state)
        .limit(1);
      
      if (existingCity && existingCity.length > 0) {
        learningStats.alreadyInDatabase++;
        console.log(`✅ ${hereCity.city}, ${hereCity.state} already in database (KMA: ${existingCity[0].kma_code})`);
      } else {
        // NEW CITY DISCOVERED!
        console.log(`🆕 NEW DISCOVERY: ${hereCity.city}, ${hereCity.state} - not in database!`);
        learningStats.newCitiesDiscovered++;
        
        // FREIGHT INTELLIGENT KMA ANALYSIS
        const kmaAnalysis = await intelligentKMAAnalysisForNewCity(hereCity, currentKMACoverage, baseCity);
        
        if (kmaAnalysis.shouldAdd) {
          console.log(`🎯 FREIGHT INTELLIGENT APPROVAL: ${hereCity.city}, ${hereCity.state}`);
          console.log(`   📍 KMA: ${kmaAnalysis.kmaInfo.kma_code} (${kmaAnalysis.reason})`);
          
          learningStats.newKMAsDiscovered.add(kmaAnalysis.kmaInfo.kma_code);
          if (kmaAnalysis.reason.includes('gap')) {
            learningStats.kmaGapsFilled++;
          }
          
          newCities.push({
            ...hereCity,
            ...kmaAnalysis.kmaInfo,
            discovered_by: 'here_api',
            discovered_date: new Date().toISOString(),
            learned_from_base: `${baseCity.city}, ${baseCity.state}`,
            search_type: type,
            intelligence_reason: kmaAnalysis.reason,
            freight_intelligence: kmaAnalysis.intelligenceScore
          });
        } else {
          console.log(`❌ FREIGHT INTELLIGENT REJECTION: ${hereCity.city}, ${hereCity.state}`);
          console.log(`   🚫 Reason: ${kmaAnalysis.reason}`);
          learningStats.duplicateKMAsRejected++;
        }
      }
    }
    
    // Add new cities to the database
    if (newCities.length > 0) {
      const addedCities = await addDiscoveredCitiesToDatabase(newCities);
      learningStats.addedToDatabase = addedCities.length;
      
      console.log(`🧠 FREIGHT INTELLIGENT LEARNING COMPLETE for ${baseCity.city}, ${baseCity.state}:`);
      console.log(`   📊 HERE.com found: ${learningStats.hereCitiesFound} cities`);
      console.log(`   ✅ Already in database: ${learningStats.alreadyInDatabase}`);
      console.log(`   🆕 New discoveries: ${learningStats.newCitiesDiscovered}`);
      console.log(`   🎯 Freight intelligent approvals: ${newCities.length}`);
      console.log(`   🚫 KMA duplicates rejected: ${learningStats.duplicateKMAsRejected}`);
      console.log(`   💾 Added to database: ${learningStats.addedToDatabase}`);
      console.log(`   🗺️ New KMA zones discovered: ${learningStats.newKMAsDiscovered.size}`);
      console.log(`   🔧 KMA gaps filled: ${learningStats.kmaGapsFilled}`);
      
      // TEACH SUPABASE: Log what the master database was missing
      if (learningStats.kmaGapsFilled > 0) {
        console.log(`📚 TEACHING SUPABASE: Master database was missing ${learningStats.kmaGapsFilled} cities in underrepresented KMAs`);
        console.log(`🔍 Supabase should improve coverage in these KMA zones: ${Array.from(learningStats.newKMAsDiscovered).join(', ')}`);
      }
      
      // Return the successfully added cities for immediate use
      return addedCities;
    } else {
      console.log(`📚 No new cities to learn - database already complete for ${baseCity.city}, ${baseCity.state}`);
      return [];
    }
    
  } catch (error) {
    console.error(`❌ Learning system error for ${baseCity.city}, ${baseCity.state}:`, error);
    return [];
  }
}

/**
 * Determine KMA code for a newly discovered city
 */
async function determineKMAForNewCity(newCity) {
  console.log(`🔍 Determining KMA for new city: ${newCity.city}, ${newCity.state}`);
  
  try {
    // Find the closest existing city in our database to determine KMA
    const { data: nearestCities } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code, kma_name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(100); // Get a sample to find the nearest
    
    if (!nearestCities || nearestCities.length === 0) {
      console.warn(`⚠️ No cities with KMA codes found to reference for ${newCity.city}, ${newCity.state}`);
      return { kma_code: null, kma_name: null };
    }
    
    // Calculate distances and find nearest city
    let nearestCity = null;
    let minDistance = Infinity;
    
    for (const city of nearestCities) {
      const distance = calculateDistance(
        newCity.latitude, newCity.longitude,
        city.latitude, city.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }
    
    if (nearestCity && minDistance <= 50) { // Within 50 miles of known KMA
      console.log(`🎯 Assigned KMA ${nearestCity.kma_code} to ${newCity.city}, ${newCity.state} (nearest: ${nearestCity.city}, ${nearestCity.state_or_province}, ${minDistance.toFixed(1)} miles)`);
      return {
        kma_code: nearestCity.kma_code,
        kma_name: nearestCity.kma_name
      };
    } else {
      console.warn(`⚠️ No nearby KMA found for ${newCity.city}, ${newCity.state} (nearest: ${minDistance.toFixed(1)} miles)`);
      return { kma_code: null, kma_name: null };
    }
    
  } catch (error) {
    console.error(`❌ Error determining KMA for ${newCity.city}, ${newCity.state}:`, error);
    return { kma_code: null, kma_name: null };
  }
}

/**
 * Add discovered cities to the database
 */
async function addDiscoveredCitiesToDatabase(newCities) {
  console.log(`💾 Adding ${newCities.length} newly discovered cities to database...`);
  
  const addedCities = [];
  
  for (const city of newCities) {
    try {
      const { data, error } = await supabase
        .from('cities')
        .insert({
          city: city.city,
          state_or_province: city.state,
          zip: city.zip || null,
          latitude: city.latitude,
          longitude: city.longitude,
          kma_code: city.kma_code,
          kma_name: city.kma_name,
          discovered_by: city.discovered_by,
          discovered_date: city.discovered_date,
          learned_from_base: city.learned_from_base,
          search_type: city.search_type
        })
        .select();
      
      if (error) {
        console.error(`❌ Failed to add ${city.city}, ${city.state}:`, error.message);
      } else {
        console.log(`✅ Added new city: ${city.city}, ${city.state} (KMA: ${city.kma_code || 'unknown'})`);
        addedCities.push(data[0]);
      }
      
    } catch (insertError) {
      console.error(`❌ Insert error for ${city.city}, ${city.state}:`, insertError);
    }
  }
  
  console.log(`💾 Successfully added ${addedCities.length}/${newCities.length} new cities to database`);
  return addedCities;
}

/**
 * Enhanced intelligent pairs with learning system
 */
export async function generateLearningIntelligentPairs(params) {
  console.log(`🧠 LEARNING INTELLIGENT SYSTEM: Discovering more cities while generating pairs`);
  
  const { origin, destination, equipment, preferFillTo10, usedCities } = params;
  
  try {
    // Step 1: Discover additional pickup cities
    console.log(`🔍 Learning Phase 1: Discovering additional pickup cities...`);
    const newPickupCities = await discoverAndLearnCities(origin, 100, 'pickup');
    
    // Step 2: Discover additional delivery cities  
    console.log(`🔍 Learning Phase 2: Discovering additional delivery cities...`);
    const newDeliveryCities = await discoverAndLearnCities(destination, 100, 'delivery');
    
    // Step 3: Now generate pairs using the enhanced database
    console.log(`🎯 Generation Phase: Creating pairs with enhanced database...`);
    
    // Import and use the standard intelligent system, but now with enhanced data
    const { generateDefinitiveIntelligentPairs } = await import('./definitiveIntelligent.js');
    const result = await generateDefinitiveIntelligentPairs(params);
    
    // Step 4: Add learning metadata
    if (result.pairs) {
      result.learningStats = {
        newPickupCitiesDiscovered: newPickupCities.length,
        newDeliveryCitiesDiscovered: newDeliveryCities.length,
        totalNewCities: newPickupCities.length + newDeliveryCities.length
      };
      
      // Mark pairs that use newly discovered cities
      result.pairs = result.pairs.map(pair => ({
        ...pair,
        learning: {
          pickup_was_discovered: newPickupCities.some(nc => 
            nc.city.toLowerCase() === pair.pickup.city.toLowerCase() &&
            nc.state_or_province.toLowerCase() === pair.pickup.state.toLowerCase()
          ),
          delivery_was_discovered: newDeliveryCities.some(nc => 
            nc.city.toLowerCase() === pair.delivery.city.toLowerCase() &&
            nc.state_or_province.toLowerCase() === pair.delivery.state.toLowerCase()
          )
        }
      }));
    }
    
    console.log(`🧠 FREIGHT INTELLIGENT LEARNING COMPLETE: Enhanced database with ${newPickupCities.length + newDeliveryCities.length} KMA-optimized cities`);
    console.log(`   🎯 Pickup KMA gaps filled: ${newPickupCities.filter(c => c.intelligence_reason?.includes('gap')).length}`);
    console.log(`   🎯 Delivery KMA gaps filled: ${newDeliveryCities.filter(c => c.intelligence_reason?.includes('gap')).length}`);
    console.log(`   🌐 Cross-state opportunities added: ${newPickupCities.concat(newDeliveryCities).filter(c => c.intelligence_reason?.includes('Cross-state')).length}`);
    console.log(`   🚫 Duplicate KMAs rejected: ${(newPickupCities.concat(newDeliveryCities).reduce((sum, c) => sum + (c.duplicateKMAsRejected || 0), 0))}`);
    
    return result;
    
  } catch (error) {
    console.error(`❌ Learning intelligent system failed:`, error);
    
    // Fallback to standard system
    const { generateDefinitiveIntelligentPairs } = await import('./definitiveIntelligent.js');
    return await generateDefinitiveIntelligentPairs(params);
  }
}

/**
 * Analyze current KMA coverage around a base city
 */
async function analyzeCurrentKMACoverage(baseCity, type) {
  try {
    const { data: nearbyCities } = await supabase
      .from('cities')
      .select('kma_code, kma_name, city, state_or_province, latitude, longitude')
      .not('kma_code', 'is', null)
      .not('latitude', 'is', null)
      .limit(200); // Get a good sample
    
    if (!nearbyCities?.length) {
      return { kmaCodes: new Set(), diversityScore: 0, kmaDistribution: {} };
    }
    
    // Filter to cities within reasonable distance (100 miles)
    const nearbyWithDistance = nearbyCities
      .map(city => ({
        ...city,
        distance: calculateDistance(
          baseCity.latitude, 
          baseCity.longitude,
          city.latitude,
          city.longitude
        )
      }))
      .filter(city => city.distance <= 100);
    
    // Analyze KMA distribution
    const kmaDistribution = {};
    const kmaCodes = new Set();
    
    for (const city of nearbyWithDistance) {
      kmaCodes.add(city.kma_code);
      if (!kmaDistribution[city.kma_code]) {
        kmaDistribution[city.kma_code] = { count: 0, cities: [] };
      }
      kmaDistribution[city.kma_code].count++;
      kmaDistribution[city.kma_code].cities.push(`${city.city}, ${city.state_or_province}`);
    }
    
    // Calculate diversity score (more unique KMAs = higher score)
    const diversityScore = kmaCodes.size / Math.max(nearbyWithDistance.length / 10, 1);
    
    return { kmaCodes, diversityScore, kmaDistribution };
    
  } catch (error) {
    console.error(`❌ KMA coverage analysis error:`, error);
    return { kmaCodes: new Set(), diversityScore: 0, kmaDistribution: {} };
  }
}

/**
 * Freight intelligent analysis for new city addition
 */
async function intelligentKMAAnalysisForNewCity(discoveredCity, currentCoverage, baseCity) {
  try {
    // Determine KMA for the discovered city
    const kmaInfo = await determineKMAForNewCity(discoveredCity);
    
    if (!kmaInfo.kma_code) {
      return {
        shouldAdd: false,
        reason: 'Could not determine KMA code',
        kmaInfo,
        intelligenceScore: 0
      };
    }
    
    // FREIGHT INTELLIGENCE CRITERIA:
    
    // 1. If this KMA is not represented in current coverage = HIGH PRIORITY
    if (!currentCoverage.kmaCodes.has(kmaInfo.kma_code)) {
      return {
        shouldAdd: true,
        reason: `Fills KMA gap - ${kmaInfo.kma_code} not represented in current coverage`,
        kmaInfo,
        intelligenceScore: 10
      };
    }
    
    // 2. If this KMA is underrepresented (only 1-2 cities) = MEDIUM PRIORITY  
    const currentKMACount = currentCoverage.kmaDistribution[kmaInfo.kma_code]?.count || 0;
    if (currentKMACount <= 2) {
      return {
        shouldAdd: true,
        reason: `Improves KMA coverage - ${kmaInfo.kma_code} only has ${currentKMACount} cities nearby`,
        kmaInfo,
        intelligenceScore: 7
      };
    }
    
    // 3. Cross-state freight opportunity = MEDIUM PRIORITY
    const discoveredState = discoveredCity.state?.toUpperCase();
    const baseState = baseCity.state_or_province?.toUpperCase();
    if (discoveredState && baseState && discoveredState !== baseState) {
      return {
        shouldAdd: true,
        reason: `Cross-state freight opportunity - ${discoveredState} to ${baseState} corridor`,
        kmaInfo,
        intelligenceScore: 6
      };
    }
    
    // 4. If KMA is well-represented (3+ cities) = LOW PRIORITY / REJECT
    if (currentKMACount >= 3) {
      return {
        shouldAdd: false,
        reason: `KMA ${kmaInfo.kma_code} already well-represented with ${currentKMACount} cities nearby`,
        kmaInfo,
        intelligenceScore: 2
      };
    }
    
    // Default: moderate priority
    return {
      shouldAdd: true,
      reason: `Moderate freight value - expands ${kmaInfo.kma_code} coverage`,
      kmaInfo,
      intelligenceScore: 5
    };
    
  } catch (error) {
    console.error(`❌ Intelligent KMA analysis error:`, error);
    return {
      shouldAdd: false,
      reason: `Analysis error: ${error.message}`,
      kmaInfo: { kma_code: null, kma_name: null },
      intelligenceScore: 0
    };
  }
}

/**
 * Haversine distance calculation
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
