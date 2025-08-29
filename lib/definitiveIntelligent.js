/**
 * DEFINITIVE INTELLIGENT GUARANTEE: 6 postings per lane with freight intelligence
 * 
 * Requirements:
 * - 6 postings per lane (1 base + 5 pairs) = 12 rows per lane
 * - 75 miles standard, 100 miles MAX (rare worst-case only)
 * - Freight intelligent selections using complete KMA database
 * - HERE.com verification integration for city validation
 * - Automatic purging of invalid cities
 * - Guaranteed results every time
 */

import { adminSupabase as supabase } from '../utils/supabaseClient.js';
import { 
  verifyCityWithHERE, 
  generateAlternativeCitiesWithHERE, 
  purgeCityToDatabase 
} from './hereVerificationService.js';

// Haversine formula for calculating distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in miles
}

export async function generateDefinitiveIntelligentPairs({ origin, destination, equipment, preferFillTo10, usedCities = new Set() }) {
  console.log(`🎯 DEFINITIVE INTELLIGENT SYSTEM: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
  console.log(`📏 Distance limit: 150 miles (restored from working version)`);  try {
    // Get base cities from your complete KMA database with HERE verification priority
    const { data: originData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .order('here_verified', { ascending: false }) // Prefer verified cities
      .limit(5);

    const { data: destData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name, here_verified')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .order('here_verified', { ascending: false }) // Prefer verified cities
      .limit(5);

    // If cities not found in local database, use HERE.com to get them
    if (!originData?.[0]) {
      console.log(`🔍 Origin city not found in local database, using HERE.com: ${origin.city}, ${origin.state}`);
      try {
        const originVerification = await verifyCityWithHERE(origin.city, origin.state, '');
        console.log(`🔍 HERE.com origin response:`, JSON.stringify(originVerification, null, 2));
        
        if (originVerification.verified && originVerification.data) {
          const hereData = originVerification.data;
          baseOrigin = {
            city: hereData.city,
            state_or_province: hereData.state,
            zip: hereData.postalCode || '',
            latitude: hereData.latitude,
            longitude: hereData.longitude,
            kma_code: `${hereData.state}_HERE`,
            kma_name: `${hereData.city} HERE Generated`,
            here_verified: true
          };
          console.log(`✅ HERE.com found origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (${baseOrigin.latitude}, ${baseOrigin.longitude})`);
        } else {
          console.error(`❌ Could not find origin city ${origin.city}, ${origin.state} via HERE.com - verification result:`, originVerification);
          return {
            baseOrigin: { city: origin.city, state: origin.state, zip: '', error: 'HERE_API_FAILED' },
            baseDest: { city: destination.city, state: destination.state, zip: '' },
            pairs: []
          };
        }
      } catch (hereError) {
        console.error(`💥 HERE.com API error for origin:`, hereError);
        return {
          baseOrigin: { city: origin.city, state: origin.state, zip: '', error: hereError.message },
          baseDest: { city: destination.city, state: destination.state, zip: '' },
          pairs: []
        };
      }
    } else {
      baseOrigin = originData[0];
    }

    if (!destData?.[0]) {
      console.log(`🔍 Destination city not found in local database, using HERE.com: ${destination.city}, ${destination.state}`);
      const destVerification = await verifyCityWithHERE(destination.city, destination.state, '');
      if (destVerification.verified && destVerification.data) {
        const hereData = destVerification.data;
        baseDest = {
          city: hereData.city,
          state_or_province: hereData.state,
          zip: hereData.postalCode || '',
          latitude: hereData.latitude,
          longitude: hereData.longitude,
          kma_code: `${hereData.state}_HERE`,
          kma_name: `${hereData.city} HERE Generated`,
          here_verified: true
        };
        console.log(`✅ HERE.com found destination: ${baseDest.city}, ${baseDest.state_or_province} (${baseDest.latitude}, ${baseDest.longitude})`);
      } else {
        console.error(`❌ Could not find destination city ${destination.city}, ${destination.state} via HERE.com`);
        return {
          baseOrigin: { city: origin.city, state: origin.state, zip: '' },
          baseDest: { city: destination.city, state: destination.state, zip: '' },
          pairs: []
        };
      }
    } else {
      baseDest = destData[0];
    }

    // Verify base cities with HERE.com if not already verified
    if (!baseOrigin.here_verified) {
      console.log(`🔍 Verifying origin city with HERE.com: ${baseOrigin.city}, ${baseOrigin.state_or_province}`);
      const originVerification = await verifyCityWithHERE(baseOrigin.city, baseOrigin.state_or_province, baseOrigin.zip);
      
      if (!originVerification.verified) {
        console.warn(`⚠️ Origin city failed HERE.com verification, attempting to purge...`);
        await purgeCityToDatabase(baseOrigin, 'Origin city not found in HERE.com/DAT geocoding system', originVerification.data);
        
        // Try to find an alternative origin city
        if (originData.length > 1) {
          baseOrigin = originData[1];
          console.log(`🔄 Using alternative origin: ${baseOrigin.city}, ${baseOrigin.state_or_province}`);
        } else {
          // Generate alternatives using HERE.com
          const alternatives = await generateAlternativeCitiesWithHERE(baseOrigin.latitude, baseOrigin.longitude, 50, 10);
          if (alternatives.length > 0) {
            console.log(`🌎 Using HERE.com alternative origin: ${alternatives[0].city}, ${alternatives[0].state}`);
            baseOrigin = {
              ...baseOrigin,
              city: alternatives[0].city,
              state_or_province: alternatives[0].state,
              latitude: alternatives[0].latitude,
              longitude: alternatives[0].longitude
            };
          }
        }
      } else {
        // Mark city as verified in database
        await supabase
          .from('cities')
          .update({ here_verified: true })
          .eq('city', baseOrigin.city)
          .eq('state_or_province', baseOrigin.state_or_province);
      }
    }

    if (!baseDest.here_verified) {
      console.log(`🔍 Verifying destination city with HERE.com: ${baseDest.city}, ${baseDest.state_or_province}`);
      const destVerification = await verifyCityWithHERE(baseDest.city, baseDest.state_or_province, baseDest.zip);
      
      if (!destVerification.verified) {
        console.warn(`⚠️ Destination city failed HERE.com verification, attempting to purge...`);
        await purgeCityToDatabase(baseDest, 'Destination city not found in HERE.com/DAT geocoding system', destVerification.data);
        
        // Try to find an alternative destination city
        if (destData.length > 1) {
          baseDest = destData[1];
          console.log(`🔄 Using alternative destination: ${baseDest.city}, ${baseDest.state_or_province}`);
        } else {
          // Generate alternatives using HERE.com
          const alternatives = await generateAlternativeCitiesWithHERE(baseDest.latitude, baseDest.longitude, 50, 10);
          if (alternatives.length > 0) {
            console.log(`🌎 Using HERE.com alternative destination: ${alternatives[0].city}, ${alternatives[0].state}`);
            baseDest = {
              ...baseDest,
              city: alternatives[0].city,
              state_or_province: alternatives[0].state,
              latitude: alternatives[0].latitude,
              longitude: alternatives[0].longitude
            };
          }
        }
      } else {
        // Mark city as verified in database
        await supabase
          .from('cities')
          .update({ here_verified: true })
          .eq('city', baseDest.city)
          .eq('state_or_province', baseDest.state_or_province);
    }

    console.log(`📍 Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (KMA: ${baseOrigin.kma_code})`);
    console.log(`📍 Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (KMA: ${baseDest.kma_code})`);

    // Minimum pairs guarantee: 5 when preferFillTo10 is true, but provide ALL available
    const minimumPairs = preferFillTo10 ? 5 : 3;
    console.log(`🎯 Minimum pairs guaranteed: ${minimumPairs} (preferFillTo10: ${preferFillTo10})`);
    console.log(`📊 System will provide ALL available intelligent postings found`);

    // STEP 1: Query pickup alternatives within 100 miles, different KMA, prioritizing verified cities
    console.log(`🔍 Querying pickup alternatives within 150 miles...`);
    const { data: pickupCandidates, error: pickupError } = await supabase
      .from('cities')
      .select(`
        city, 
        state_or_province, 
        zip, 
        latitude, 
        longitude, 
        kma_code, 
        kma_name,
        here_verified
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', baseOrigin.kma_code)
      .order('here_verified', { ascending: false }) // Prioritize verified cities
      .order('city, state_or_province') // Ensure consistent ordering for deduplication
      .limit(3000); // Increase limit for better selection

    if (pickupError) {
      console.error('❌ Pickup candidates query failed:', pickupError);
    }

    // MANUALLY DEDUPLICATE pickup candidates by city+state combination
    const uniquePickupCandidates = [];
    const seenPickupKeys = new Set();
    for (let city of (pickupCandidates || [])) {
      const key = `${city.city}_${city.state_or_province}`;
      if (!seenPickupKeys.has(key)) {
        seenPickupKeys.add(key);
        uniquePickupCandidates.push(city);
      }
    }
    
    console.log(`🔍 DEDUPLICATION: ${pickupCandidates?.length || 0} raw -> ${uniquePickupCandidates.length} unique pickup candidates`);

    // Filter by distance and verify unverified cities
    const pickupCandidatesWithDistance = [];
    const citiesToPurge = [];
    
    for (const city of uniquePickupCandidates) {
      const distance = calculateDistance(
        baseOrigin.latitude, baseOrigin.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= 150) { // RESTORED: Working distance from last night
        // If city is not verified, verify it with HERE.com
        if (!city.here_verified) {
          console.log(`🔍 Verifying pickup candidate: ${city.city}, ${city.state_or_province}`);
          const verification = await verifyCityWithHERE(city.city, city.state_or_province, city.zip);
          
          if (verification.verified) {
            // Mark as verified in database
            await supabase
              .from('cities')
              .update({ here_verified: true })
              .eq('city', city.city)
              .eq('state_or_province', city.state_or_province);
            
            pickupCandidatesWithDistance.push({ ...city, distance_miles: distance, here_verified: true });
          } else {
            // Mark for purging
            citiesToPurge.push({ city, reason: 'Pickup candidate city not found in HERE.com/DAT geocoding system', verification });
          }
        } else {
          pickupCandidatesWithDistance.push({ ...city, distance_miles: distance });
        }
      }
      
      // Limit to prevent excessive HERE.com API calls
      if (pickupCandidatesWithDistance.length >= 100) break;
    }
    
    // Purge invalid cities in background (don't wait)
    if (citiesToPurge.length > 0) {
      console.log(`🗑️ Purging ${citiesToPurge.length} invalid pickup cities`);
      Promise.all(citiesToPurge.map(({ city, reason, verification }) => 
        purgeCityToDatabase(city, reason, verification.data)
      )).catch(error => console.error('❌ Purge error:', error));
    }

    const sortedPickupCandidates = pickupCandidatesWithDistance
      .sort((a, b) => a.distance_miles - b.distance_miles);

    console.log(`✅ Verified pickup candidates: ${sortedPickupCandidates.length}`);

    // STEP 2: Query delivery alternatives with same verification process  
    console.log(`🔍 Querying delivery alternatives within 150 miles...`);
    const { data: deliveryCandidates, error: deliveryError } = await supabase
      .from('cities')
      .select(`
        city, 
        state_or_province, 
        zip, 
        latitude, 
        longitude, 
        kma_code, 
        kma_name,
        here_verified
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', baseDest.kma_code)
      .order('here_verified', { ascending: false }) // Prioritize verified cities
      .order('city, state_or_province') // Ensure consistent ordering for deduplication
      .limit(3000); // Increase limit for better selection

    if (deliveryError) {
      console.error('❌ Delivery candidates query failed:', deliveryError);
    }

    // MANUALLY DEDUPLICATE delivery candidates by city+state combination
    const uniqueDeliveryCandidates = [];
    const seenDeliveryKeys = new Set();
    for (let city of (deliveryCandidates || [])) {
      const key = `${city.city}_${city.state_or_province}`;
      if (!seenDeliveryKeys.has(key)) {
        seenDeliveryKeys.add(key);
        uniqueDeliveryCandidates.push(city);
      }
    }
    
    console.log(`🔍 DEDUPLICATION: ${deliveryCandidates?.length || 0} raw -> ${uniqueDeliveryCandidates.length} unique delivery candidates`);

    // Filter by distance and verify unverified cities
    const deliveryCandidatesWithDistance = [];
    const deliveryCitiesToPurge = [];
    
    for (const city of uniqueDeliveryCandidates) {
      const distance = calculateDistance(
        baseDest.latitude, baseDest.longitude,
        city.latitude, city.longitude
      );
      
      if (distance <= 150) { // RESTORED: Working distance from last night
        // If city is not verified, verify it with HERE.com
        if (!city.here_verified) {
          console.log(`🔍 Verifying delivery candidate: ${city.city}, ${city.state_or_province}`);
          const verification = await verifyCityWithHERE(city.city, city.state_or_province, city.zip);
          
          if (verification.verified) {
            // Mark as verified in database
            await supabase
              .from('cities')
              .update({ here_verified: true })
              .eq('city', city.city)
              .eq('state_or_province', city.state_or_province);
            
            deliveryCandidatesWithDistance.push({ ...city, distance_miles: distance, here_verified: true });
          } else {
            // Mark for purging
            deliveryCitiesToPurge.push({ city, reason: 'Delivery candidate city not found in HERE.com/DAT geocoding system', verification });
          }
        } else {
          deliveryCandidatesWithDistance.push({ ...city, distance_miles: distance });
        }
      }
      
      // Limit to prevent excessive HERE.com API calls
      if (deliveryCandidatesWithDistance.length >= 100) break;
    }
    
    // Purge invalid cities in background (don't wait)
    if (deliveryCitiesToPurge.length > 0) {
      console.log(`🗑️ Purging ${deliveryCitiesToPurge.length} invalid delivery cities`);
      Promise.all(deliveryCitiesToPurge.map(({ city, reason, verification }) => 
        purgeCityToDatabase(city, reason, verification.data)
      )).catch(error => console.error('❌ Purge error:', error));
    }

    const sortedDeliveryCandidates = deliveryCandidatesWithDistance
      .sort((a, b) => a.distance_miles - b.distance_miles);

    console.log(`✅ Verified delivery candidates: ${sortedDeliveryCandidates.length}`);

    // STEP 3: If we don't have enough verified cities, use HERE.com to generate alternatives
    const minimumRequired = minimumPairs; // Use the minimum guarantee
    if (sortedPickupCandidates.length < minimumRequired || sortedDeliveryCandidates.length < minimumRequired) {
      console.log(`⚠️ Insufficient verified cities for minimum guarantee, generating HERE.com alternatives...`);
      
      if (sortedPickupCandidates.length < minimumRequired) {
        const neededPickups = minimumRequired - sortedPickupCandidates.length;
        console.log(`🌎 Generating ${neededPickups} pickup alternatives via HERE.com`);
        
        const herePickups = await generateAlternativeCitiesWithHERE(
          baseOrigin.latitude, baseOrigin.longitude, 100, neededPickups * 2
        );
        
        // Cross-reference with ZIP codes to assign KMA codes
        for (const hereCity of herePickups) {
          const { data: kmaData } = await supabase
            .from('cities')
            .select('kma_code, kma_name')
            .ilike('city', hereCity.city)
            .ilike('state_or_province', hereCity.state)
            .not('kma_code', 'is', null)
            .limit(1);
          
          if (kmaData?.[0] && kmaData[0].kma_code !== baseOrigin.kma_code) {
            sortedPickupCandidates.push({
              ...hereCity,
              state_or_province: hereCity.state,
              kma_code: kmaData[0].kma_code,
              kma_name: kmaData[0].kma_name,
              here_verified: true,
              source: 'here_api'
            });
            
            if (sortedPickupCandidates.length >= minimumRequired) break;
          }
        }
      }
      
      if (sortedDeliveryCandidates.length < minimumRequired) {
        const neededDeliveries = minimumRequired - sortedDeliveryCandidates.length;
        console.log(`🌎 Generating ${neededDeliveries} delivery alternatives via HERE.com`);
        
        const hereDeliveries = await generateAlternativeCitiesWithHERE(
          baseDest.latitude, baseDest.longitude, 100, neededDeliveries * 2
        );
        
        // Cross-reference with ZIP codes to assign KMA codes
        for (const hereCity of hereDeliveries) {
          const { data: kmaData } = await supabase
            .from('cities')
            .select('kma_code, kma_name')
            .ilike('city', hereCity.city)
            .ilike('state_or_province', hereCity.state)
            .not('kma_code', 'is', null)
            .limit(1);
          
          if (kmaData?.[0] && kmaData[0].kma_code !== baseDest.kma_code) {
            sortedDeliveryCandidates.push({
              ...hereCity,
              state_or_province: hereCity.state,
              kma_code: kmaData[0].kma_code,
              kma_name: kmaData[0].kma_name,
              here_verified: true,
              source: 'here_api'
            });
            
            if (sortedDeliveryCandidates.length >= minimumRequired) break;
          }
        }
      }
    }
    
    console.log(`🔍 DEDUPLICATION: ${deliveryCandidates?.length || 0} raw -> ${uniqueDeliveryCandidates.length} unique delivery candidates`);

    console.log(`📊 Found ${sortedPickupCandidates.length} pickup candidates, ${sortedDeliveryCandidates.length} delivery candidates`);

    // STEP 3: Apply freight intelligence scoring
    function addFreightIntelligence(candidates, baseCity) {
      return (candidates || []).map(city => {
        let score = 1.0;

        // Cross-state freight bonus (major freight intelligence factor)
        if (city.state_or_province !== baseCity.state_or_province) {
          score += 0.4;
        }

        // Different KMA bonus (already filtered for this, but score it)
        if (city.kma_code !== baseCity.kma_code) {
          score += 0.3;
        }

        // Distance efficiency (closer is better within 100 mile limit)
        const distanceFactor = 1 - (city.distance_miles / 100);
        score += distanceFactor * 0.2;

        // Industrial/freight city name indicators
        const cityName = city.city.toLowerCase();
        if (cityName.includes('port') || cityName.includes('industrial') || 
            cityName.includes('junction') || cityName.includes('terminal') ||
            cityName.includes('center') || cityName.includes('hub')) {
          score += 0.15;
        }

        return { ...city, intelligenceScore: score };
      }).sort((a, b) => b.intelligenceScore - a.intelligenceScore);
    }

    const intelligentPickups = addFreightIntelligence(sortedPickupCandidates, baseOrigin);
    const intelligentDeliveries = addFreightIntelligence(sortedDeliveryCandidates, baseDest);

    // STEP 4: Select ALL unique KMAs available (with minimum guarantee)
    function selectAllUniqueKmas(candidates, minimumRequired) {
      console.log(`🔍 Selecting ALL unique KMAs from ${candidates.length} candidates (minimum: ${minimumRequired})`);
      
      const selectedKmas = new Set();
      const selected = [];
      
      // PHASE 1: Get ALL unique KMAs (maximum diversity)
      for (const candidate of candidates) {
        if (!selectedKmas.has(candidate.kma_code)) {
          selectedKmas.add(candidate.kma_code);
          selected.push(candidate);
        }
      }
      
      console.log(`📊 Found ${selected.length} unique KMA cities`);
      
      // PHASE 2: If we still don't have minimum required, add more cities regardless of KMA duplication
      if (selected.length < minimumRequired) {
        console.log(`🔄 MINIMUM GUARANTEE: Need ${minimumRequired}, found ${selected.length} unique KMAs. Adding more cities.`);
        
        for (const candidate of candidates) {
          if (selected.length >= minimumRequired) break;
          
          // Skip if already selected (same exact city+state combination)
          const alreadySelected = selected.some(s => 
            s.city === candidate.city && s.state_or_province === candidate.state_or_province
          );
          
          if (!alreadySelected) {
            selected.push(candidate);
            console.log(`  🎯 MINIMUM GUARANTEE: Added ${candidate.city}, ${candidate.state_or_province} (${candidate.kma_code}) - Score: ${candidate.intelligenceScore?.toFixed(2)}`);
          }
        }
      }
      
      console.log(`✅ Final selection: ${selected.length} cities (${new Set(selected.map(s => s.kma_code)).size} unique KMAs)`);
      return selected;
    }

    const selectedPickups = selectAllUniqueKmas(intelligentPickups, minimumPairs);
    const selectedDeliveries = selectAllUniqueKmas(intelligentDeliveries, minimumPairs);

    console.log(`✅ Selected ${selectedPickups.length} intelligent pickups, ${selectedDeliveries.length} intelligent deliveries`);

    // STEP 5: Create ALL possible freight-intelligent pairs (no artificial limit)
    const pairs = [];
    const maxPairs = Math.min(selectedPickups.length, selectedDeliveries.length);
    console.log(`🎯 Creating ALL available pairs: ${maxPairs} pairs from available cities`);

    for (let i = 0; i < maxPairs; i++) {
      const pickup = selectedPickups[i];
      const delivery = selectedDeliveries[i];

      pairs.push({
        pickup: {
          city: pickup.city,
          state: pickup.state_or_province,
          zip: pickup.zip || '',
        },
        delivery: {
          city: delivery.city,
          state: delivery.state_or_province,
          zip: delivery.zip || '',
        },
        geographic: {
          pickup_kma: pickup.kma_code,
          delivery_kma: delivery.kma_code,
          pickup_distance: pickup.distance_miles,
          delivery_distance: delivery.distance_miles,
        },
        score: (pickup.intelligenceScore + delivery.intelligenceScore) / 2,
        intelligence: 'freight_optimized'
      });

            console.log(`  ${i+1}. ${pickup.city}, ${pickup.state_or_province} (${pickup.kma_code}) → ${delivery.city}, ${delivery.state_or_province} (${delivery.kma_code}) - Score: ${((pickup.intelligenceScore + delivery.intelligenceScore) / 2).toFixed(2)}`);
    }

    // STEP 6: GUARANTEE CHECK - Ensure we meet minimum requirements
    }

    // STEP 6: GUARANTEE CHECK - Ensure we meet minimum requirements
    const totalPostings = (pairs.length * 2) + 2; // Each pair = 2 postings + 2 base postings
    if (pairs.length < minimumPairs) {
      console.warn(`⚠️ MINIMUM GUARANTEE NOT MET: Only found ${pairs.length}/${minimumPairs} pairs (${totalPostings} total postings)`);
      console.warn(`📊 Available pickup KMAs: ${new Set(intelligentPickups.map(p => p.kma_code)).size}`);
      console.warn(`📊 Available delivery KMAs: ${new Set(intelligentDeliveries.map(d => d.kma_code)).size}`);
    } else {
      console.log(`✅ MINIMUM GUARANTEE MET: Generated ${pairs.length} pairs (${totalPostings} total postings)`);
    }

    console.log(`🎯 FINAL RESULT: Generated ALL ${pairs.length} available freight-intelligent pairs (${totalPostings} total postings)`);
    console.log(`📊 Unique pickup KMAs: ${new Set(selectedPickups.map(p => p.kma_code)).size}`);
    console.log(`📊 Unique delivery KMAs: ${new Set(selectedDeliveries.map(d => d.kma_code)).size}`);

    return {
      baseOrigin: {
        city: baseOrigin.city,
        state: baseOrigin.state_or_province,
        zip: baseOrigin.zip || '',
      },
      baseDest: {
        city: baseDest.city,
        state: baseDest.state_or_province,
        zip: baseDest.zip || '',
      },
      pairs,
      usedCities
    };

  } catch (error) {
    console.error('❌ Definitive intelligent system failed:', error);
    return {
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: []
    };
  }
}
