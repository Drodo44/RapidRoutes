// lib/exportDatCsv.js
import Papa from 'papaparse';
import { getTopCrawlCities } from './cityUtils';

function generateRandomWeight(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function generateDatCsv(lanes, options = {}) {
  let allRows = [];

  for (const lane of lanes) {
    const {
      origin,
      destination,
      equipment,
      length,
      baseWeight,
      randomizeWeight,
      randomLow,
      randomHigh,
      dateEarliest,
      dateLatest,
      commodity,
    } = lane;

    const pickupCities = await getTopCrawlCities(origin, 10);
    const dropoffCities = await getTopCrawlCities(destination, 10);

    const postings = [
      { origin, destination },
      ...pickupCities.map((pickup, idx) => ({
        origin: pickup,
        destination: dropoffCities[idx % dropoffCities.length],
      })),
    ];

    for (const posting of postings) {
      const contactMethods = ['Email', 'Primary Phone'];
      for (const method of contactMethods) {
        allRows.push({
          'Pickup Earliest*': dateEarliest,
          'Pickup Latest': dateLatest,
          'Length (ft)*': length,
          'Weight (lbs)*': randomizeWeight
            ? generateRandomWeight(randomLow, randomHigh)
            : baseWeight,
          'Full/Partial*': 'Full',
          'Equipment*': equipment,
          'Use Private Network*': 'NO',
          'Private Network Rate': '',
          'Allow Private Network Booking': 'NO',
          'Allow Private Network Bidding': 'NO',
          'Use DAT Loadboard*': 'YES',
          'DAT Loadboard Rate': '',
          'Allow DAT Loadboard Booking': 'NO',
          'Use Extended Network': 'NO',
          'Contact Method*': method,
          'Origin City*': posting.origin.split(',')[0].trim(),
          'Origin State*': posting.origin.split(',')[1]?.trim() || '',
          'Origin Postal Code': '',
          'Destination City*': posting.destination.split(',')[0].trim(),
          'Destination State*': posting.destination.split(',')[1]?.trim() || '',
          'Destination Postal Code': '',
          Comment: '',
          Commodity: commodity || '',
          'Reference ID': '',
        });
      }
    }
  }

  return Papa.unparse(allRows, { quotes: true });
}
