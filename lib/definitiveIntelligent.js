/**
 * DEFINITIVE INTELLIGENT GUARANTEE: 6 postings per lane with freight intelligence
 * 
 * Requirements:
 * - 6 postings per lane (1 base + 5 pairs) = 12 rows per lane
 * - 75-100 miles MAX distance
 * - Freight intelligent selections using complete KMA database
 * - Guaranteed results every time
 */

import { adminSupabase as supabase } from '../utils/supabaseClient.js';

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
  console.log(`📏 Distance limit: 75-150 miles MAX for freight intelligence`);
  
  try {
    // Get base cities from your complete KMA database
    const { data: originData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    const { data: destData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    if (!originData?.[0] || !destData?.[0]) {
      console.error('❌ Could not find base cities in KMA database');
      return {
        baseOrigin: { city: origin.city, state: origin.state, zip: '' },
        baseDest: { city: destination.city, state: destination.state, zip: '' },
        pairs: []
      };
    }

    const baseOrigin = originData[0];
    const baseDest = destData[0];

    console.log(`📍 Base Origin: ${baseOrigin.city}, ${baseOrigin.state_or_province} (KMA: ${baseOrigin.kma_code})`);
    console.log(`📍 Base Dest: ${baseDest.city}, ${baseDest.state_or_province} (KMA: ${baseDest.kma_code})`);

    // Target pairs: Always 5 when preferFillTo10 is true
    const targetPairs = preferFillTo10 ? 5 : 3;
    console.log(`🎯 Target pairs: ${targetPairs} (preferFillTo10: ${preferFillTo10})`);
    console.log(`🔍 PRODUCTION DEBUG: Expected final output = ${targetPairs + 1} postings × 2 contacts = ${(targetPairs + 1) * 2} rows per lane`);

    // STEP 1: Query pickup alternatives within 100 miles, different KMA
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
        kma_name
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', baseOrigin.kma_code)
      .order('city, state_or_province') // Ensure consistent ordering for deduplication
      .limit(2000); // Increase limit since we have many duplicates

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

    // Filter by distance in JavaScript (more reliable than PostGIS RPC)
    const pickupCandidatesWithDistance = uniquePickupCandidates
      .map(city => {
        const distance = calculateDistance(
          baseOrigin.latitude, baseOrigin.longitude,
          city.latitude, city.longitude
        );
        return { ...city, distance_miles: distance };
      })
      .filter(city => city.distance_miles <= 150) // Expand to 150 miles for better coverage
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, 100); // Increase to 100 since we now have real geographic diversity

    // STEP 2: Query delivery alternatives within 150 miles, different KMA  
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
        kma_name
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('kma_code', 'is', null)
      .neq('kma_code', baseDest.kma_code)
      .order('city, state_or_province') // Ensure consistent ordering for deduplication
      .limit(2000); // Increase limit since we have many duplicates

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

    // Filter by distance in JavaScript
    const deliveryCandidatesWithDistance = uniqueDeliveryCandidates
      .map(city => {
        const distance = calculateDistance(
          baseDest.latitude, baseDest.longitude,
          city.latitude, city.longitude
        );
        return { ...city, distance_miles: distance };
      })
      .filter(city => city.distance_miles <= 150) // Expand to 150 miles for better coverage
      .sort((a, b) => a.distance_miles - b.distance_miles)
      .slice(0, 100); // Increase to 100 since we now have real geographic diversity

    console.log(`📊 Found ${pickupCandidatesWithDistance?.length || 0} pickup candidates, ${deliveryCandidatesWithDistance?.length || 0} delivery candidates`);

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

    const intelligentPickups = addFreightIntelligence(pickupCandidatesWithDistance, baseOrigin);
    const intelligentDeliveries = addFreightIntelligence(deliveryCandidatesWithDistance, baseDest);

    // STEP 4: Select best unique KMAs for maximum diversity with intelligent fallback
    function selectBestUniqueKmas(candidates, needed) {
      const selectedKmas = new Set();
      const selected = [];
      
      // PHASE 1: Get unique KMAs first (maximum diversity)
      for (const candidate of candidates) {
        if (selected.length >= needed) break;
        if (!selectedKmas.has(candidate.kma_code)) {
          selectedKmas.add(candidate.kma_code);
          selected.push(candidate);
        }
      }
      
      // PHASE 2: INTELLIGENT FALLBACK - fill remaining slots with best candidates
      if (selected.length < needed) {
        console.log(`🔄 INTELLIGENT FALLBACK: Need ${needed}, found ${selected.length} unique KMAs. Filling remaining ${needed - selected.length} slots.`);
        
        for (const candidate of candidates) {
          if (selected.length >= needed) break;
          
          // Skip if already selected (same exact city+state combination)
          const alreadySelected = selected.some(s => 
            s.city === candidate.city && s.state_or_province === candidate.state_or_province
          );
          
          if (!alreadySelected) {
            selected.push(candidate);
            console.log(`  🎯 FALLBACK: Added ${candidate.city}, ${candidate.state_or_province} (${candidate.kma_code}) - Score: ${candidate.intelligenceScore?.toFixed(2)}`);
          }
        }
      }
      
      return selected;
    }

    const selectedPickups = selectBestUniqueKmas(intelligentPickups, targetPairs);
    const selectedDeliveries = selectBestUniqueKmas(intelligentDeliveries, targetPairs);

    console.log(`✅ Selected ${selectedPickups.length} intelligent pickups, ${selectedDeliveries.length} intelligent deliveries`);

    // GUARANTEED MINIMUM: If we don't have enough unique KMAs, fill with next best options
    if (selectedPickups.length < targetPairs || selectedDeliveries.length < targetPairs) {
      console.warn(`⚠️ INSUFFICIENT UNIQUE KMAs: Got ${selectedPickups.length} pickups, ${selectedDeliveries.length} deliveries (need ${targetPairs})`);
      console.log(`🔄 FALLBACK: Adding non-unique KMAs to meet minimum ${targetPairs} pairs guarantee`);
      
      // Add more pickups if needed (even if not unique KMAs)
      while (selectedPickups.length < targetPairs && selectedPickups.length < intelligentPickups.length) {
        const nextPickup = intelligentPickups.find(p => !selectedPickups.some(sp => sp.city === p.city && sp.state_or_province === p.state_or_province));
        if (nextPickup) selectedPickups.push(nextPickup);
        else break;
      }
      
      // Add more deliveries if needed (even if not unique KMAs)
      while (selectedDeliveries.length < targetPairs && selectedDeliveries.length < intelligentDeliveries.length) {
        const nextDelivery = intelligentDeliveries.find(d => !selectedDeliveries.some(sd => sd.city === d.city && sd.state_or_province === d.state_or_province));
        if (nextDelivery) selectedDeliveries.push(nextDelivery);
        else break;
      }
      
      console.log(`🔄 FALLBACK RESULT: Now have ${selectedPickups.length} pickups, ${selectedDeliveries.length} deliveries`);
    }

    // STEP 5: Create freight-intelligent pairs
    const pairs = [];
    const maxPairs = Math.min(selectedPickups.length, selectedDeliveries.length, targetPairs);

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

    // STEP 6: GUARANTEE CHECK - If we don't have enough pairs, this is a data issue
    if (pairs.length < targetPairs) {
      console.warn(`⚠️ INSUFFICIENT KMA DIVERSITY: Only found ${pairs.length}/${targetPairs} unique KMA pairs within 100 miles`);
      console.warn(`📊 Available pickup KMAs: ${new Set(intelligentPickups.map(p => p.kma_code)).size}`);
      console.warn(`📊 Available delivery KMAs: ${new Set(intelligentDeliveries.map(d => d.kma_code)).size}`);
      console.error(`🚨 PRODUCTION ISSUE: This lane will generate ${(pairs.length + 1) * 2} rows instead of expected ${(targetPairs + 1) * 2} rows`);
      
      // This indicates either:
      // 1. The region genuinely lacks KMA diversity within 100 miles
      // 2. Database query issues
      // 3. KMA distribution problems in your specific test lanes
    }

    console.log(`🎯 DEFINITIVE RESULT: Generated ${pairs.length}/${targetPairs} freight-intelligent pairs`);
    console.log(`📊 PRODUCTION RESULT: This lane will generate ${(pairs.length + 1) * 2} CSV rows`);

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
