/**
 * DEFINITIVE INTELLIGENT SYSTEM
 * Generates DAT-compatible city pairs with freight intelligence
 */

import { adminSupabase } from '../utils/supabaseClient.js';
import { findDatCompatibleCities, findDatVerifiedCitiesInKma } from './datCityFinder.js';
import { smartVerifyCity } from './datVerificationLearner.js';

import { calculateDistance } from './distanceCalculator.js';

/**
 * Convert coordinates to numbers
 */
function ensureNumericCoords(city) {
  return {
    ...city,
    latitude: Number(city.latitude),
    longitude: Number(city.longitude)
  };
}

/**
 * Generate DAT-compatible intelligent pairs
 */
export async function generateDefinitiveIntelligentPairs({
  origin,
  destination,
  equipment,
  preferFillTo10,
  usedCities = new Set()
}) {
  console.log(`🎯 DEFINITIVE INTELLIGENT SYSTEM: ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state}`);

  try {
    // Get base cities with all metadata
    const { data: baseOrigin, error: originError } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);

    const { data: baseDest, error: destError } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', destination.city)
      .ilike('state_or_province', destination.state)
      .limit(1);

    if (!baseOrigin?.[0] || !baseDest?.[0]) {
      console.error('❌ Base cities not found in database:', { originError, destError });
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }
    
    // Log raw base city data for debugging
    console.log('Raw base city data:', {
      origin: baseOrigin?.[0],
      dest: baseDest?.[0]
    });

    // Use first match and validate coordinates
    const baseOriginCity = baseOrigin[0];
    const baseDestCity = baseDest[0];

    // Ensure we have all required fields
    if (!baseOriginCity?.city || !baseOriginCity?.state_or_province ||
        !baseDestCity?.city || !baseDestCity?.state_or_province) {
      console.error('❌ Missing required fields in base cities');
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }

    // Verify coordinates are valid numbers
    const coords = {
      origin: {
        lat: Number(baseOriginCity?.latitude),
        lon: Number(baseOriginCity?.longitude)
      },
      dest: {
        lat: Number(baseDestCity?.latitude),
        lon: Number(baseDestCity?.longitude)
      }
    };

    // Log coordinate validation attempt
    console.log('Base city coordinate validation:', {
      origin: {
        raw: {
          lat: baseOriginCity?.latitude,
          lon: baseOriginCity?.longitude
        },
        parsed: coords.origin
      },
      dest: {
        raw: {
          lat: baseDestCity?.latitude,
          lon: baseDestCity?.longitude
        },
        parsed: coords.dest
      }
    });

    if (isNaN(coords.origin.lat) || isNaN(coords.origin.lon) ||
        isNaN(coords.dest.lat) || isNaN(coords.dest.lon)) {
      console.error('❌ Invalid coordinates in base cities:', coords);
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }

    // Update city objects with validated coordinates
    baseOriginCity.latitude = coords.origin.lat;
    baseOriginCity.longitude = coords.origin.lon;
    baseDestCity.latitude = coords.dest.lat;
    baseDestCity.longitude = coords.dest.lon;

    // Verify DAT compatibility
    const originOk = await smartVerifyCity(baseOriginCity.city, baseOriginCity.state_or_province, baseOriginCity.zip);
    const destOk = await smartVerifyCity(baseDestCity.city, baseDestCity.state_or_province, baseDestCity.zip);

    if (!originOk || !destOk) {
      console.error('❌ Base cities failed DAT verification');
      return { pairs: [], baseOrigin: origin, baseDest: destination };
    }

    // Get DAT-compatible cities within range
    console.log('🔍 Finding DAT-compatible cities...');
    const pickupCities = await findDatCompatibleCities(baseOriginCity, 75, 10);
    const deliveryCities = await findDatCompatibleCities(baseDestCity, 75, 10);

    // Generate all possible pairs
    const pairs = [];
    for (const pickup of pickupCities) {
      for (const delivery of deliveryCities) {
        const pairKey = `${pickup.city},${pickup.state_or_province}->${delivery.city},${delivery.state_or_province}`;
        if (usedCities.has(pairKey)) continue;

        // Calculate distances with validated coordinates
      const coordinates = {
        origin: {
          lat: Number(baseOriginCity.latitude),
          lon: Number(baseOriginCity.longitude)
        },
        dest: {
          lat: Number(baseDestCity.latitude),
          lon: Number(baseDestCity.longitude)
        },
        pickup: {
          lat: Number(pickup.latitude),
          lon: Number(pickup.longitude)
        },
        delivery: {
          lat: Number(delivery.latitude),
          lon: Number(delivery.longitude)
        }
      };

      // Validate all coordinates
      if (Object.values(coordinates).some(coord => 
          isNaN(coord.lat) || isNaN(coord.lon))) {
        console.warn('Invalid coordinates detected:', coordinates);
        continue;
      }

      console.log('Base Origin:', baseOriginCity.city, {
        lat: coordinates.origin.lat,
        lon: coordinates.origin.lon
      });
      console.log('Pickup:', pickup.city, {
        lat: coordinates.pickup.lat,
        lon: coordinates.pickup.lon
      });

      const pickupDistance = calculateDistance(
        coordinates.origin.lat,
        coordinates.origin.lon,
        coordinates.pickup.lat,
        coordinates.pickup.lon
      );

      console.log('Base Dest:', baseDestCity.city, {
        lat: coordinates.dest.lat,
        lon: coordinates.dest.lon
      });
      console.log('Delivery:', delivery.city, {
        lat: coordinates.delivery.lat,
        lon: coordinates.delivery.lon
      });

      const deliveryDistance = calculateDistance(
        coordinates.dest.lat,
        coordinates.dest.lon,
        coordinates.delivery.lat,
        coordinates.delivery.lon
      );

      // Calculate score based on distances and KMAs
      let score = 1.0;

      // Distance efficiency
      if (pickupDistance > 75) score *= 0.8;
      if (deliveryDistance > 75) score *= 0.8;
      if (pickupDistance < 10) score *= 0.9;
      if (deliveryDistance < 10) score *= 0.9;

      // KMA diversity bonus
      if (pickup.kma_code !== baseOriginCity.kma_code) score *= 1.2;
      if (delivery.kma_code !== baseDestCity.kma_code) score *= 1.2;
        
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
            pickup_distance: pickupDistance,
            delivery_distance: deliveryDistance,
            pickup_distance: calculateDistance(
              baseOrigin.latitude, baseOrigin.longitude,
              pickup.latitude, pickup.longitude
            ),
            delivery_distance: calculateDistance(
              baseDest.latitude, baseDest.longitude,
              delivery.latitude, delivery.longitude
            )
          },
          score,
          intelligence: 'freight_optimized'
        });

        usedCities.add(pairKey);
      }
    }

    // Sort by score and pick the best 5 pairs
    const selectedPairs = pairs
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    console.log(`✅ Generated ${selectedPairs.length} DAT-compatible pairs`);
    selectedPairs.forEach((pair, i) => {
      console.log(`  ${i + 1}. ${pair.pickup.city}, ${pair.pickup.state} -> ${pair.delivery.city}, ${pair.delivery.state} (Score: ${pair.score.toFixed(2)})`);
    });

    return {
      pairs: selectedPairs,
      baseOrigin: {
        city: baseOriginCity.city,
        state: baseOriginCity.state_or_province,
        zip: baseOriginCity.zip
      },
      baseDest: {
        city: baseDestCity.city,
        state: baseDestCity.state_or_province,
        zip: baseDestCity.zip
      }
    };

  } catch (error) {
    console.error('Error generating intelligent pairs:', error);
    return { pairs: [], baseOrigin: origin, baseDest: destination };
  }
}
