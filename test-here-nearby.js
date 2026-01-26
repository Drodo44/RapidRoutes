import { getNearbyLocalities } from './lib/hereNearbyLocalities.js';

const seeds = [
  { name: 'Fresno, CA', lat: 36.7378, lng: -119.7871 },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.0740 },
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 }
];

(async () => {
  for (const { name, lat, lng } of seeds) {
    console.log(`\n=== HERE Nearby Localities: ${name} ===`);
    try {
      const { cities, debug } = await getNearbyLocalities({ lat, lng, radiusMiles: 100, limit: 100 });
      console.log(`Total fetched (before filter): ${debug.totalFetchedBeforeFilter}`);
      console.log(`Total after dedup: ${debug.totalAfterDedup}`);
      console.log(`Endpoint used: ${debug.endpointUsed}`);
      cities.slice(0, 10).forEach((c, i) => {
        console.log(`${i + 1}. ${c.city}, ${c.state_or_province} (${c.latitude}, ${c.longitude})`);
      });
    } catch (e) {
      console.error('HERE nearby error:', e.message);
    }
  }
})();
