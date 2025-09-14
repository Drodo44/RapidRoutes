// Updated diagnostic test runner for Phase 8 with HERE.com city enrichment
import { generateDiversePairs } from '../lib/FreightIntelligence.js';
import { enrichCityData } from '../lib/cityEnrichment.js';

const testLanes = [
  { origin: 'Cincinnati, OH', destination: 'Chicago, IL', equipmentCode: 'FD' },
  { origin: 'Atlanta, GA', destination: 'Dallas, TX', equipmentCode: 'V' },
  { origin: 'Los Angeles, CA', destination: 'Seattle, WA', equipmentCode: 'R' },
  { origin: 'Miami, FL', destination: 'New York, NY', equipmentCode: 'FD' },
  { origin: 'Denver, CO', destination: 'Phoenix, AZ', equipmentCode: 'V' },
  { origin: 'Houston, TX', destination: 'San Francisco, CA', equipmentCode: 'R' },
  { origin: 'Boston, MA', destination: 'Detroit, MI', equipmentCode: 'FD' },
  { origin: 'Las Vegas, NV', destination: 'Portland, OR', equipmentCode: 'V' }
];

// Enhanced logging for diagnostic runner
async function verifyAndEnrichCity(city) {
  const [cityName, state] = city.split(', ');
  try {
    const enrichedCity = await enrichCityData(cityName, state);
    if (!enrichedCity) {
      throw new Error(`City verification failed for ${city}`);
    }

    console.log(`📋 Enriched City: ${enrichedCity.city}, State: ${enrichedCity.state_or_province}, ZIP: ${enrichedCity.zip}, KMA: ${enrichedCity.kma || 'N/A'}`);
    return enrichedCity;
  } catch (error) {
    console.error(`Error enriching city ${city}:`, error.message);
    throw error;
  }
}

(async () => {
  const summary = [];

  for (const lane of testLanes) {
    console.log(`Testing lane: ${lane.origin} to ${lane.destination} with equipment ${lane.equipmentCode}`);
    try {
      const origin = await verifyAndEnrichCity(lane.origin);
      const destination = await verifyAndEnrichCity(lane.destination);

      const diversePairs = await generateDiversePairs({
        origin: { city: origin.city, state: origin.state_or_province },
        destination: { city: destination.city, state: destination.state_or_province },
        equipmentCode: lane.equipmentCode
      });

      console.log('Diverse pairs generated:', diversePairs.pairs.length);

      summary.push({
        lane: `${lane.origin} to ${lane.destination}`,
        pairsGenerated: diversePairs.pairs.length,
        fallbackTriggered: false
      });
    } catch (error) {
      console.error('Error processing lane:', lane, error);
      summary.push({
        lane: `${lane.origin} to ${lane.destination}`,
        error: error.message
      });
    }
  }

  console.log('\n=== Summary ===');
  summary.forEach((result) => {
    if (result.error) {
      console.log(`❌ ${result.lane} (Error: ${result.error})`);
    } else {
      console.log(`✅ ${result.lane} (${result.pairsGenerated} pairs, fallback not needed)`);
    }
  });
})();