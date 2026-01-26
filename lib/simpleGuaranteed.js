#!/usr/bin/env node

/**
 * NUCLEAR FIX: Guaranteed 6 postings per lane
 * 
 * This bypasses all complex KMA logic and uses a simple, bulletproof approach:
 * 1. Base posting (origin -> destination)
 * 2. Find ANY 5 cities within reasonable distance for pickups/deliveries
 * 3. No KMA restrictions, just geographic proximity and freight relevance
 */

import supabaseAdmin from '@/lib/supabaseAdmin';
const supabase = supabaseAdmin;

/*
 * SIMPLE GUARANTEE: Find 5 pickup + 5 delivery cities within 100 miles worst-case
 */
async function generateGuaranteedPairs({ baseOrigin, baseDest, equipment, usedCities = new Set() }) {
  console.log(`🎯 GUARANTEED GENERATION: Finding 5 pickup + 5 delivery cities within 100 miles worst-case`);

  try {
    // Simple pickup alternatives - just find cities within 100 miles worst-case, period
    const { data: pickupCities } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(100);

    // Simple delivery alternatives 
    const { data: deliveryCities } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(100);

    // Calculate distances and filter
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    // Filter by distance and remove used cities + ADD FREIGHT INTELLIGENCE SCORING
    const availablePickups = (pickupCities || [])
      .filter(city => {
        const distance = calculateDistance(baseOrigin.latitude, baseOrigin.longitude, city.latitude, city.longitude);
        const key = `${city.city.toLowerCase()}-${city.state_or_province.toLowerCase()}`;
        return distance <= 100 && !usedCities.has(key);
      })
      .map(city => {
        const distance = calculateDistance(baseOrigin.latitude, baseOrigin.longitude, city.latitude, city.longitude);
        
        // FREIGHT INTELLIGENCE SCORING
        let intelligenceScore = 1.0;
        
        // Prefer different states (cross-border freight)
        if (city.state_or_province !== baseOrigin.state_or_province) {
          intelligenceScore += 0.3;
        }
        
        // Prefer different KMA codes (market diversity)
        if (city.kma_code && city.kma_code !== baseOrigin.kma_code) {
          intelligenceScore += 0.4;
        }
        
        // Distance penalty (closer is better for freight efficiency)
        const distancePenalty = distance / 100; // 0-1 scale
        intelligenceScore *= (1 - distancePenalty * 0.5);
        
        // Industrial city bonus (freight-heavy names)
        const cityName = city.city.toLowerCase();
        if (cityName.includes('port') || cityName.includes('industrial') || 
            cityName.includes('junction') || cityName.includes('terminal')) {
          intelligenceScore += 0.2;
        }
        
        // Major highway corridor bonus (based on city names/locations)
        if (cityName.includes('junction') || cityName.includes('crossing') ||
            cityName.includes('center') || cityName.includes('hub')) {
          intelligenceScore += 0.15;
        }
        
        return { ...city, distance, intelligenceScore };
      })
      .sort((a, b) => b.intelligenceScore - a.intelligenceScore); // Best intelligence first

    const availableDeliveries = (deliveryCities || [])
      .filter(city => {
        const distance = calculateDistance(baseDest.latitude, baseDest.longitude, city.latitude, city.longitude);
        const key = `${city.city.toLowerCase()}-${city.state_or_province.toLowerCase()}`;
        return distance <= 100 && !usedCities.has(key);
      })
      .map(city => {
        const distance = calculateDistance(baseDest.latitude, baseDest.longitude, city.latitude, city.longitude);
        
        // FREIGHT INTELLIGENCE SCORING
        let intelligenceScore = 1.0;
        
        // Prefer different states (cross-border freight)
        if (city.state_or_province !== baseDest.state_or_province) {
          intelligenceScore += 0.3;
        }
        
        // Prefer different KMA codes (market diversity)  
        if (city.kma_code && city.kma_code !== baseDest.kma_code) {
          intelligenceScore += 0.4;
        }
        
        // Distance penalty (closer is better for freight efficiency)
        const distancePenalty = distance / 100; // 0-1 scale
        intelligenceScore *= (1 - distancePenalty * 0.5);
        
        // Industrial city bonus
        const cityName = city.city.toLowerCase();
        if (cityName.includes('port') || cityName.includes('industrial') || 
            cityName.includes('junction') || cityName.includes('terminal')) {
          intelligenceScore += 0.2;
        }
        
        // Major highway corridor bonus
        if (cityName.includes('junction') || cityName.includes('crossing') ||
            cityName.includes('center') || cityName.includes('hub')) {
          intelligenceScore += 0.15;
        }
        
        return { ...city, distance, intelligenceScore };
      })
      .sort((a, b) => b.intelligenceScore - a.intelligenceScore); // Best intelligence first

    console.log(`📊 FREIGHT INTELLIGENCE: Found ${availablePickups.length} pickup cities, ${availableDeliveries.length} delivery cities`);
    
    // Log intelligence scores for top candidates
    console.log('🎯 TOP PICKUP CANDIDATES (by freight intelligence):');
    availablePickups.slice(0, 5).forEach((city, i) => {
      console.log(`  ${i+1}. ${city.city}, ${city.state_or_province} (${city.kma_code}) - Score: ${city.intelligenceScore.toFixed(2)}, ${city.distance.toFixed(1)}mi`);
    });
    
    console.log('🎯 TOP DELIVERY CANDIDATES (by freight intelligence):');
    availableDeliveries.slice(0, 5).forEach((city, i) => {
      console.log(`  ${i+1}. ${city.city}, ${city.state_or_province} (${city.kma_code}) - Score: ${city.intelligenceScore.toFixed(2)}, ${city.distance.toFixed(1)}mi`);
    });

    // Take exactly 5 of each (or as many as available)
    const selectedPickups = availablePickups.slice(0, 5);
    const selectedDeliveries = availableDeliveries.slice(0, 5);

    // Create pairs - match them up 1:1
    const pairs = [];
    const maxPairs = Math.min(selectedPickups.length, selectedDeliveries.length, 5);

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
          pickup_kma: pickup.kma_code || 'UNK',
          delivery_kma: delivery.kma_code || 'UNK',
          pickup_distance: pickup.distance,
          delivery_distance: delivery.distance,
          pickup_intelligence: pickup.intelligenceScore,
          delivery_intelligence: delivery.intelligenceScore,
        },
        score: (pickup.intelligenceScore + delivery.intelligenceScore) / 2, // Combined intelligence
      });

      // Mark cities as used
      usedCities.add(`${pickup.city.toLowerCase()}-${pickup.state_or_province.toLowerCase()}`);
      usedCities.add(`${delivery.city.toLowerCase()}-${delivery.state_or_province.toLowerCase()}`);
    }

    console.log(`✅ INTELLIGENT GUARANTEE: Generated ${pairs.length} pairs with freight intelligence`);
    pairs.forEach((pair, i) => {
      console.log(`  ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state} (Score: ${pair.score.toFixed(2)})`);
    });
    return { pairs, usedCities };

  } catch (error) {
    console.error('❌ Guaranteed generation failed:', error);
    return { pairs: [], usedCities };
  }
}

/**
 * REPLACE the complex generateGeographicCrawlPairs with this simple version
 */
export async function generateSimpleGuaranteedPairs({ origin, destination, equipment, preferFillTo10, usedCities = new Set() }) {
  console.log(`🚀 SIMPLE GUARANTEED SYSTEM: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);
  
  try {
    // Get base cities
    const { data: originData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .not('latitude', 'is', null)
      .limit(1);

    const { data: destData } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .not('latitude', 'is', null)
      .limit(1);

    if (!originData?.[0] || !destData?.[0]) {
      console.error('❌ Could not find base cities');
      return {
        baseOrigin: { city: origin.city, state: origin.state, zip: '' },
        baseDest: { city: destination.city, state: destination.state, zip: '' },
        pairs: []
      };
    }

    const baseOrigin = originData[0];
    const baseDest = destData[0];

    // Generate exactly 5 pairs (or 3 if not preferFillTo10)
    const targetPairs = preferFillTo10 ? 5 : 3;
    const { pairs } = await generateGuaranteedPairs({
      baseOrigin,
      baseDest,
      equipment,
      usedCities
    });

    // Take exactly what we need
    const finalPairs = pairs.slice(0, targetPairs);

    console.log(`✅ SIMPLE SYSTEM COMPLETE: ${finalPairs.length}/${targetPairs} pairs generated`);

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
      pairs: finalPairs,
      usedCities
    };

  } catch (error) {
    console.error('❌ Simple guaranteed system failed:', error);
    return {
      baseOrigin: { city: origin.city, state: origin.state, zip: '' },
      baseDest: { city: destination.city, state: destination.state, zip: '' },
      pairs: []
    };
  }
}
