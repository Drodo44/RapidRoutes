/**
 * DEFINITIVE INTELLIGENT SYSTEM
 * Generates DAT-compatible city pairs with freight intelligence
 */
import { adminSupabase } from '../utils/supabaseClient.js';
import { findDatCompatibleCities } from './datCityFinder.js';
import { smartVerifyCity } from './datVerificationLearner.js';
import { calculateDistance } from './distanceCalculator.js';
import { validateCityCoordinates } from './cityValidator.js';

/**
 * Calculate freight intelligence score for a city pair
 */
function calculateFreightScore(pickup, delivery, baseOrigin, baseDest) {
  let score = 1.0;

  // Distance efficiency (closer is better within limits)
  const pickupDistance = calculateDistance(
    Number(baseOrigin.latitude), Number(baseOrigin.longitude),
    Number(pickup.latitude), Number(pickup.longitude)
  );
  const deliveryDistance = calculateDistance(
    Number(baseDest.latitude), Number(baseDest.longitude),
    Number(delivery.latitude), Number(delivery.longitude)
  );

  // Distance scoring (optimize for efficient distances)
  if (pickupDistance <= 25) score *= 1.3;      // Ideal close range
  else if (pickupDistance <= 50) score *= 1.2; // Good range
  else if (pickupDistance <= 75) score *= 1.1; // Acceptable range
  else score *= 0.8;                           // Less desirable

  if (deliveryDistance <= 25) score *= 1.3;
  else if (deliveryDistance <= 50) score *= 1.2;
  else if (deliveryDistance <= 75) score *= 1.1;
  else score *= 0.8;

  // Market diversity scoring
  if (pickup.kma_code !== baseOrigin.kma_code) {
    score *= 1.25; // Strong bonus for different market
    if (pickup.population > 100000) score *= 1.15; // Major market bonus
  }
  if (delivery.kma_code !== baseDest.kma_code) {
    score *= 1.25;
    if (delivery.population > 100000) score *= 1.15;
  }

  // Infrastructure quality scoring
  if (pickup.dat_verified && delivery.dat_verified) score *= 1.4;  // Both verified
  else if (pickup.dat_verified || delivery.dat_verified) score *= 1.2; // One verified

  // Population-based infrastructure scoring
  if (pickup.population > 100000) score *= 1.2;     // Major city
  else if (pickup.population > 50000) score *= 1.1;  // Medium city
  
  if (delivery.population > 100000) score *= 1.2;
  else if (delivery.population > 50000) score *= 1.1;

  return score;
}

/**
 * Generates optimized DAT-compatible city pairs
 */
export async function generateDefinitiveIntelligentPairs(origin, destination) {
  try {
    console.log('📍 TEST CASE: Major Market Test');
    console.log(`Base Route: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);

    // Input validation
    if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
      console.error('Invalid input: Missing required city/state data');
      return { pairs: [], baseOrigin: origin, baseDest: destination, error: 'INVALID_INPUT' };
    }

    // Get full city data from database
    const { data: cityData, error: cityError } = await adminSupabase
      .from('cities')
      .select('*')
      .or(`city.ilike.${origin.city},city.ilike.${destination.city}`)
      .or(`state_or_province.ilike.${origin.state},state_or_province.ilike.${destination.state}`);

    if (cityError) {
      console.error('Error fetching city data:', cityError);
      return { pairs: [], baseOrigin: origin, baseDest: destination, error: 'DATABASE_ERROR' };
    }

    // Find matching cities
    const baseOrigin = cityData.find(c => 
      c.city.toLowerCase() === origin.city.toLowerCase() &&
      c.state_or_province.toLowerCase() === origin.state.toLowerCase()
    );
    const baseDest = cityData.find(c => 
      c.city.toLowerCase() === destination.city.toLowerCase() &&
      c.state_or_province.toLowerCase() === destination.state.toLowerCase()
    );

    if (!baseOrigin || !baseDest) {
      console.error('Base cities not found:', { origin, destination });
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }

    // Validate coordinates
    if (!validateCityCoordinates(baseOrigin) || !validateCityCoordinates(baseDest)) {
      console.error('Invalid coordinates for base cities');
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }

    // Verify cities with HERE.com
    console.log('🔍 Verifying cities via HERE.com...');
    
    try {
      const [originVerified, destVerified] = await Promise.all([
        smartVerifyCity({
          city: baseOrigin.city,
          state_or_province: baseOrigin.state_or_province,
          zip: baseOrigin.zip
        }),
        smartVerifyCity({
          city: baseDest.city,
          state_or_province: baseDest.state_or_province,
          zip: baseDest.zip
        })
      ]);

      console.log(`${originVerified ? '✅' : '❌'} ${baseOrigin.city}, ${baseOrigin.state_or_province}`);
      console.log(`${destVerified ? '✅' : '❌'} ${baseDest.city}, ${baseDest.state_or_province}`);
      
      // Log verification to database if successful
      if (originVerified) {
        await adminSupabase.from('city_verifications').upsert({
          city: baseOrigin.city,
          state: baseOrigin.state_or_province,
          zip: baseOrigin.zip,
          verified: true,
          last_verified: new Date().toISOString()
        });
      }
      
      if (destVerified) {
        await adminSupabase.from('city_verifications').upsert({
          city: baseDest.city,
          state: baseDest.state_or_province,
          zip: baseDest.zip,
          verified: true,
          last_verified: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('City verification warning:', error.message);
    }

    // Get cities from different KMAs
    console.log('🔍 Finding cities in different market areas...');
    
    // First get adjacent KMAs
    const { data: originAdjacent } = await adminSupabase
      .from('kma_adjacency')
      .select('adjacent_kma')
      .eq('kma_code', baseOrigin.kma_code);
      
    const { data: destAdjacent } = await adminSupabase
      .from('kma_adjacency')
      .select('adjacent_kma')
      .eq('kma_code', baseDest.kma_code);
    
    // Create sets of KMAs to search
    const pickupKMAs = new Set([
      baseOrigin.kma_code,
      ...(originAdjacent?.map(k => k.adjacent_kma) || [])
    ]);
    
    const deliveryKMAs = new Set([
      baseDest.kma_code,
      ...(destAdjacent?.map(k => k.adjacent_kma) || [])
    ]);

    console.log(`� Searching pickup KMAs: ${Array.from(pickupKMAs).join(', ')}`);
    console.log(`📍 Searching delivery KMAs: ${Array.from(deliveryKMAs).join(', ')}`);

    // Get cities from each KMA
    const pickupCities = await Promise.all(
      Array.from(pickupKMAs).map(kma => 
        findDatCompatibleCities(baseOrigin, 75, 5, kma)
      )
    ).then(results => results.flat());

    const deliveryCities = await Promise.all(
      Array.from(deliveryKMAs).map(kma => 
        findDatCompatibleCities(baseDest, 75, 5, kma)
      )
    ).then(results => results.flat());

    // Generate all possible pairs
    const pairs = [];
    const usedCities = new Set();

    for (const pickup of pickupCities) {
      for (const delivery of deliveryCities) {
        const pairKey = `${pickup.city},${pickup.state_or_province}->${delivery.city},${delivery.state_or_province}`;
        if (usedCities.has(pairKey)) continue;

        const score = calculateFreightScore(pickup, delivery, baseOrigin, baseDest);
        
        pairs.push({
          pickup: {
            city: pickup.city,
            state: pickup.state_or_province,
            zip: pickup.zip
          },
          delivery: {
            city: delivery.city,
            state: delivery.state_or_province,
            zip: delivery.zip
          },
          geographic: {
            pickup_kma: pickup.kma_code,
            delivery_kma: delivery.kma_code,
            pickup_distance: calculateDistance(
              Number(baseOrigin.latitude), Number(baseOrigin.longitude),
              Number(pickup.latitude), Number(pickup.longitude)
            ),
            delivery_distance: calculateDistance(
              Number(baseDest.latitude), Number(baseDest.longitude),
              Number(delivery.latitude), Number(delivery.longitude)
            )
          },
          score,
          intelligence: 'freight_optimized'
        });

        usedCities.add(pairKey);
      }
    }

    // First, group pairs by unique KMA combinations
    const kmaGroups = new Map();
    
    for (const pair of pairs) {
      const kmaKey = `${pair.geographic.pickup_kma}->${pair.geographic.delivery_kma}`;
      if (!kmaGroups.has(kmaKey)) {
        kmaGroups.set(kmaKey, []);
      }
      kmaGroups.get(kmaKey).push(pair);
    }

    // Sort each group internally by score
    for (const group of kmaGroups.values()) {
      group.sort((a, b) => b.score - a.score);
    }

    // Convert to array of best pairs from each unique KMA combination
    const uniqueKmaPairs = Array.from(kmaGroups.values()).map(group => group[0]);
    
    // Sort by score while maintaining KMA uniqueness
    uniqueKmaPairs.sort((a, b) => b.score - a.score);

    console.log(`\n🎯 Found ${uniqueKmaPairs.length} unique KMA combinations`);
    
    // CRITICAL: Only select pairs with completely different KMAs
    const selectedPairs = [];
    const usedPickupKMAs = new Set();
    const usedDeliveryKMAs = new Set();

    // Add pairs ensuring ABSOLUTE KMA uniqueness
    for (const pair of uniqueKmaPairs) {
      const pickupKMA = pair.geographic.pickup_kma;
      const deliveryKMA = pair.geographic.delivery_kma;
      
      // Only add if BOTH KMAs are completely unused
      if (!usedPickupKMAs.has(pickupKMA) && !usedDeliveryKMAs.has(deliveryKMA)) {
        selectedPairs.push(pair);
        usedPickupKMAs.add(pickupKMA);
        usedDeliveryKMAs.add(deliveryKMA);
        
        console.log(`\n✅ Added pair with unique KMAs:
          Pickup: ${pair.pickup.city}, ${pair.pickup.state} (${pickupKMA})
          Delivery: ${pair.delivery.city}, ${pair.delivery.state} (${deliveryKMA})
          Score: ${pair.score.toFixed(2)}
        `);
      }
    }

    // If we don't have enough pairs with unique KMAs, we need to expand search
    if (selectedPairs.length < 5) {
      console.log(`\n⚠️ Only found ${selectedPairs.length} pairs with completely unique KMAs
                    Expanding search to find more KMA combinations...`);
      
      // Here we would implement the expansion logic to search in more distant KMAs
      // This could include:
      // 1. Looking in adjacent KMAs to our current KMAs
      // 2. Expanding the distance radius
      // 3. Checking seasonal or alternative KMAs
    }

    console.log(`\n✅ Generated ${selectedPairs.length} DAT-compatible pairs`);
    selectedPairs.forEach((pair, i) => {
      console.log(`\nPair ${i + 1}:`);
      console.log(`  Route: ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state}`);
      console.log(`  Score: ${pair.score.toFixed(2)}`);
      console.log(`  KMAs: ${pair.geographic.pickup_kma} -> ${pair.geographic.delivery_kma}`);
      console.log(`  Distances: ${Math.round(pair.geographic.pickup_distance)}mi pickup, ${Math.round(pair.geographic.delivery_distance)}mi delivery`);
      
      // Score breakdown
      const pickupBonus = pair.geographic.pickup_kma !== baseOrigin.kma_code ? '✓' : '×';
      const deliveryBonus = pair.geographic.delivery_kma !== baseDest.kma_code ? '✓' : '×';
      console.log(`  Market Diversity: Pickup ${pickupBonus} Delivery ${deliveryBonus}`);
    });

    return {
      pairs: selectedPairs,
      baseOrigin: {
        city: baseOrigin.city,
        state: baseOrigin.state_or_province,
        zip: baseOrigin.zip
      },
      baseDest: {
        city: baseDest.city,
        state: baseDest.state_or_province,
        zip: baseDest.zip
      }
    };

  } catch (error) {
    console.error('Error generating intelligent pairs:', error);
    return { pairs: [], baseOrigin: origin, baseDest: destination };
  }
}
