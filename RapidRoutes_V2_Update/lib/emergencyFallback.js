// lib/emergencyFallback.js
// EMERGENCY FALLBACK: Generate basic pairs when database fails
// This ensures CSV generation NEVER fails completely

/**
 * Emergency fallback when database/intelligence systems fail
 * Generates basic geographic pairs using simple state-based logic
 */
export async function generateEmergencyPairs({ origin, destination, equipment }) {
  console.log('🚨 EMERGENCY FALLBACK: Database failed, generating basic pairs');
  
  const pairs = [];
  
  // Base pair
  pairs.push({
    pickup: {
      city: origin.city,
      state: origin.state,
      state_or_province: origin.state,
      kma_code: 'UNK_001',
      kma_name: 'Unknown KMA'
    },
    delivery: {
      city: destination.city,
      state: destination.state,
      state_or_province: destination.state,
      kma_code: 'UNK_002',
      kma_name: 'Unknown KMA'
    }
  });
  
  // Generate 5 more basic variations to meet minimum 6 pairs
  const commonCities = {
    'AL': ['Birmingham', 'Mobile', 'Montgomery', 'Huntsville'],
    'CA': ['Los Angeles', 'San Francisco', 'San Diego', 'Oakland'],
    'FL': ['Miami', 'Tampa', 'Orlando', 'Jacksonville'],
    'GA': ['Atlanta', 'Savannah', 'Augusta', 'Columbus'],
    'IL': ['Chicago', 'Rockford', 'Peoria', 'Springfield'],
    'IN': ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend'],
    'MN': ['Minneapolis', 'Saint Paul', 'Duluth', 'Rochester'],
    'NY': ['New York', 'Buffalo', 'Rochester', 'Syracuse'],
    'OH': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo'],
    'PA': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
    'TN': ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga'],
    'TX': ['Houston', 'Dallas', 'San Antonio', 'Austin'],
    'WI': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha']
  };
  
  const originAlts = commonCities[origin.state] || [origin.city];
  const destAlts = commonCities[destination.state] || [destination.city];
  
  // Generate additional pairs
  for (let i = 1; i < 6; i++) {
    const pickupCity = originAlts[i % originAlts.length] || origin.city;
    const deliveryCity = destAlts[i % destAlts.length] || destination.city;
    
    pairs.push({
      pickup: {
        city: pickupCity,
        state: origin.state,
        state_or_province: origin.state,
        kma_code: `UNK_${String(i + 1).padStart(3, '0')}`,
        kma_name: 'Emergency KMA'
      },
      delivery: {
        city: deliveryCity,
        state: destination.state,
        state_or_province: destination.state,
        kma_code: `UNK_${String(i + 10).padStart(3, '0')}`,
        kma_name: 'Emergency KMA'
      }
    });
  }
  
  console.log(`🚨 Generated ${pairs.length} emergency fallback pairs`);
  
  return {
    pairs,
    source: 'emergency_fallback',
    baseOrigin: { city: origin.city, state: origin.state },
    baseDest: { city: destination.city, state: destination.state }
  };
}