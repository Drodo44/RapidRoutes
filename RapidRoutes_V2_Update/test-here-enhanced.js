
import { queryHereCities } from './lib/hereTestHelper.js';


async function testMinimalHereApi() {
  const testCases = [
    { city: "Bakersfield", state: "CA" },
    { city: "Phoenix", state: "AZ" },
    { city: "Chicago", state: "IL" }
  ];
  for (const { city, state } of testCases) {
    console.log(`\n=== HERE.com Query: ${city}, ${state} ===`);
    try {
      const results = await queryHereCities(city, state);
      console.log(`Total results: ${results.length}`);
      results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.city}, ${r.state}  (distance: ${r.distance ? r.distance.toFixed(2) : 'n/a'} mi)`);
      });
      const rejected = results.filter(r => r.distance && r.distance > 100);
      if (rejected.length) {
        console.log(`Rejected (distance > 100mi):`);
        rejected.forEach(r => console.log(`- ${r.city}, ${r.state} (${r.distance.toFixed(2)} mi)`));
      }
    } catch (e) {
      console.error(`HERE.com error: ${e.message}`);
    }
  }
}

testMinimalHereApi().catch(console.error);
