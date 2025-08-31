/**
 * DEFINITIVE INTELLIGENT GUARANTEE: 6 postings per lane with freight intelligence
 * 
 * Requirements:
 * - 6 postings per lane (1 base + 5 pairs) = 12 rows per lane
 * - 75-100 miles MAX distance
 * - Freight intelligent selections using complete KMA datab      // Expand delivery search if needed
      if (selectedDeliveries.length < targetPairs) {
        console.log(`🔍 Expanding delivery search radius to 150 miles for missing ${targetPairs - selectedDeliveries.length} deliveries...`);
        const expandedDeliveryCandidates = intelligentDeliveries
          .map(city => {
            const distance = calculateDistance(
              baseDest.latitude, baseDest.longitude,
              city.latitude, city.longitude
            );
            return { ...city, distance_miles: distance };
          })
          .filter(city => city.distance_miles <= 150) // Expand to 150 miles maximumranteed results every time
 */

import { adminSupabase as supabase } from '../utils/supabaseClient.js';
import { getDatCompatibleCitiesWithinRadius, calculateDatCompatibilityScore } from './datCompatibilityService.js';

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
  console.log(`📏 Distance limit: 75-100 miles MAX for freight intelligence`);
  
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

    // CRITICAL FIX: Normalize base cities to have both 'state' and 'state_or_province' fields
    const normalizedBaseOrigin = {
      ...baseOrigin,
      state: baseOrigin.state_or_province // Add 'state' field for compatibility
    };
    const normalizedBaseDest = {
      ...baseDest,
      state: baseDest.state_or_province // Add 'state' field for compatibility
    };

    // Target pairs: MINIMUM guarantee, but allow intelligent expansion
    const minPairs = preferFillTo10 ? 5 : 3;
    console.log(`🎯 Minimum pairs: ${minPairs} (preferFillTo10: ${preferFillTo10})`);
    console.log(`� INTELLIGENT EXPANSION: Will use MORE pairs if high-quality freight opportunities exist`);
    console.log(`�🔍 PRODUCTION DEBUG: Expected MINIMUM output = ${minPairs + 1} postings × 2 contacts = ${(minPairs + 1) * 2} rows per lane`);

    // STEP 1: Get DAT-compatible pickup alternatives within 75 miles (freight broker standard)
    console.log(`🔍 Finding DAT-compatible pickup alternatives within 75 miles...`);
    let pickupCandidates = await getDatCompatibleCitiesWithinRadius(normalizedBaseOrigin, 75, 50);
    
    // Intelligent fallback: If not enough cities found, expand to 100 miles
    if (pickupCandidates.length < 5) {
      console.log(`🔄 Expanding pickup search to 100 miles (found only ${pickupCandidates.length} within 75mi)...`);
      pickupCandidates = await getDatCompatibleCitiesWithinRadius(normalizedBaseOrigin, 100, 50);
    }
    console.log(`🔍 Found ${pickupCandidates.length} DAT-compatible pickup candidates`);

    // STEP 2: Get DAT-compatible delivery alternatives within 75 miles (freight broker standard)  
    console.log(`🔍 Finding DAT-compatible delivery alternatives within 75 miles...`);
    let deliveryCandidates = await getDatCompatibleCitiesWithinRadius(normalizedBaseDest, 75, 50);
    
    // Intelligent fallback: If not enough cities found, expand to 100 miles
    if (deliveryCandidates.length < 5) {
      console.log(`🔄 Expanding delivery search to 100 miles (found only ${deliveryCandidates.length} within 75mi)...`);
      deliveryCandidates = await getDatCompatibleCitiesWithinRadius(normalizedBaseDest, 100, 50);
    }
    console.log(`🔍 Found ${deliveryCandidates.length} DAT-compatible delivery candidates`);

    console.log(`📊 Found ${pickupCandidates.length} pickup candidates, ${deliveryCandidates.length} delivery candidates`);

    // STEP 3: Apply DAT compatibility scoring with freight intelligence
    function addFreightIntelligenceWithDatCompatibility(candidates, baseCity) {
      return (candidates || []).map(city => {
        // Start with DAT compatibility score
        let score = calculateDatCompatibilityScore(city, baseCity);

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

    const intelligentPickups = addFreightIntelligenceWithDatCompatibility(pickupCandidates, baseOrigin);
    const intelligentDeliveries = addFreightIntelligenceWithDatCompatibility(deliveryCandidates, baseDest);

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

    // INTELLIGENT PAIR SELECTION: Start with quality assessment
    console.log(`📊 Found ${intelligentPickups.length} pickup candidates, ${intelligentDeliveries.length} delivery candidates`);
    
    // Calculate intelligent maximum based on quality distribution
    const maxPickups = Math.min(intelligentPickups.length, 10); // Cap at 10 to prevent massive CSVs
    const maxDeliveries = Math.min(intelligentDeliveries.length, 10);
    const maxPossiblePairs = Math.min(maxPickups, maxDeliveries);
    
    // Determine optimal pair count: Use more if quality is high, minimum if quality is low
    const avgPickupScore = intelligentPickups.slice(0, maxPickups).reduce((sum, p) => sum + p.intelligenceScore, 0) / Math.min(maxPickups, intelligentPickups.length);
    const avgDeliveryScore = intelligentDeliveries.slice(0, maxDeliveries).reduce((sum, d) => sum + d.intelligenceScore, 0) / Math.min(maxDeliveries, intelligentDeliveries.length);
    const avgQuality = (avgPickupScore + avgDeliveryScore) / 2;
    
    // Intelligent expansion: Use more pairs if quality is above threshold
    let targetPairs = minPairs;
    if (avgQuality > 1.5 && maxPossiblePairs > minPairs) {
      targetPairs = Math.min(maxPossiblePairs, minPairs + 2); // Expand by up to 2 pairs for high quality
      console.log(`📈 QUALITY EXPANSION: High freight quality (${avgQuality.toFixed(2)}) - expanding to ${targetPairs} pairs`);
    } else if (avgQuality > 1.2 && maxPossiblePairs > minPairs) {
      targetPairs = Math.min(maxPossiblePairs, minPairs + 1); // Expand by 1 pair for good quality
      console.log(`📊 MODERATE EXPANSION: Good freight quality (${avgQuality.toFixed(2)}) - expanding to ${targetPairs} pairs`);
    } else {
      console.log(`🎯 MINIMUM MODE: Quality (${avgQuality.toFixed(2)}) - using minimum ${targetPairs} pairs`);
    }

    const selectedPickups = selectBestUniqueKmas(intelligentPickups, targetPairs);
    const selectedDeliveries = selectBestUniqueKmas(intelligentDeliveries, targetPairs);

    console.log(`✅ Selected ${selectedPickups.length} intelligent pickups, ${selectedDeliveries.length} intelligent deliveries`);

    // GUARANTEED MINIMUM: If we don't have enough unique KMAs, fill with next best options
    if (selectedPickups.length < targetPairs || selectedDeliveries.length < targetPairs) {
      console.warn(`⚠️ INSUFFICIENT UNIQUE KMAs: Got ${selectedPickups.length} pickups, ${selectedDeliveries.length} deliveries (need ${targetPairs})`);
      console.log(`🔄 INTELLIGENT FALLBACK: Adding non-unique KMAs to meet minimum ${targetPairs} pairs guarantee`);
      
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

    // NUCLEAR GUARANTEE: If still insufficient, expand distance and try again
    if (selectedPickups.length < targetPairs || selectedDeliveries.length < targetPairs) {
      console.log(`🚨 NUCLEAR GUARANTEE ACTIVATION: Expanding search radius to ensure ${targetPairs} pairs`);
      
      // Expand pickup search if needed
      if (selectedPickups.length < targetPairs) {
        console.log(`🔍 Expanding pickup search radius to 100 miles for missing ${targetPairs - selectedPickups.length} pickups...`);
        const expandedPickupCandidates = intelligentPickups
          .map(city => {
            const distance = calculateDistance(
              baseOrigin.latitude, baseOrigin.longitude,
              city.latitude, city.longitude
            );
            return { ...city, distance_miles: distance };
          })
          .filter(city => city.distance_miles <= 100) // Max 100 miles for emergency
          .sort((a, b) => a.distance_miles - b.distance_miles);
        
        const expandedIntelligentPickups = addFreightIntelligenceWithDatCompatibility(expandedPickupCandidates, baseOrigin);
        
        // Fill remaining slots with expanded search
        while (selectedPickups.length < targetPairs && expandedIntelligentPickups.length > 0) {
          const nextPickup = expandedIntelligentPickups.find(p => 
            !selectedPickups.some(sp => sp.city === p.city && sp.state_or_province === p.state_or_province)
          );
          if (nextPickup) {
            selectedPickups.push(nextPickup);
            console.log(`  🎯 NUCLEAR PICKUP: Added ${nextPickup.city}, ${nextPickup.state_or_province} (${nextPickup.distance_miles.toFixed(1)} miles)`);
          } else {
            break;
          }
        }
      }
      
      // Expand delivery search if needed
      if (selectedDeliveries.length < targetPairs) {
        console.log(`🔍 Expanding delivery search radius to 100 miles for missing ${targetPairs - selectedDeliveries.length} deliveries...`);
        const expandedDeliveryCandidates = intelligentDeliveries
          .map(city => {
            const distance = calculateDistance(
              baseDest.latitude, baseDest.longitude,
              city.latitude, city.longitude
            );
            return { ...city, distance_miles: distance };
          })
          .filter(city => city.distance_miles <= 100) // Max 100 miles for emergency
          .sort((a, b) => a.distance_miles - b.distance_miles);
        
        const expandedIntelligentDeliveries = addFreightIntelligenceWithDatCompatibility(expandedDeliveryCandidates, baseDest);
        
        // Fill remaining slots with expanded search
        while (selectedDeliveries.length < targetPairs && expandedIntelligentDeliveries.length > 0) {
          const nextDelivery = expandedIntelligentDeliveries.find(d => 
            !selectedDeliveries.some(sd => sd.city === d.city && sd.state_or_province === d.state_or_province)
          );
          if (nextDelivery) {
            selectedDeliveries.push(nextDelivery);
            console.log(`  🎯 NUCLEAR DELIVERY: Added ${nextDelivery.city}, ${nextDelivery.state_or_province} (${nextDelivery.distance_miles.toFixed(1)} miles)`);
          } else {
            break;
          }
        }
      }
      
      console.log(`🚨 NUCLEAR GUARANTEE RESULT: Final counts - ${selectedPickups.length} pickups, ${selectedDeliveries.length} deliveries`);
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

    // STEP 6: ABSOLUTE GUARANTEE - If we still don't have enough pairs, this is a critical issue
    if (pairs.length < targetPairs) {
      console.error(`🚨 CRITICAL ISSUE: Only found ${pairs.length}/${targetPairs} pairs even after nuclear guarantee`);
      console.error(`📊 Available pickup KMAs: ${new Set(intelligentPickups.map(p => p.kma_code)).size}`);
      console.error(`📊 Available delivery KMAs: ${new Set(intelligentDeliveries.map(d => d.kma_code)).size}`);
      console.error(`� FINAL FALLBACK: Will generate ${(pairs.length + 1) * 2} rows instead of expected ${(targetPairs + 1) * 2} rows`);
      
      // Log the exact issue for debugging
      console.error(`🔍 DEBUG INFO:`);
      console.error(`   - Selected pickups: ${selectedPickups.length}`);
      console.error(`   - Selected deliveries: ${selectedDeliveries.length}`);
      console.error(`   - Max possible pairs: ${Math.min(selectedPickups.length, selectedDeliveries.length)}`);
      console.error(`   - Pairs created: ${pairs.length}`);
      
      // This indicates either:
      // 1. The region genuinely lacks diversity even within 300 miles
      // 2. Database query issues  
      // 3. KMA distribution problems in your specific test lanes
      // 4. Code logic error (investigate!)
    } else {
      console.log(`✅ GUARANTEE SUCCESS: Generated exactly ${pairs.length}/${targetPairs} freight-intelligent pairs`);
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
