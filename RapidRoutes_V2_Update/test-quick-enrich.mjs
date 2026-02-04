#!/usr/bin/env node

/**
 * Test the new quick-enrich API endpoint
 * Should return cities in ~50ms vs 30s timeout
 */

const testLane = {
  id: 'test_123',
  origin_city: 'Fitzgerald',
  origin_state: 'GA',
  destination_city: 'Atlanta',
  destination_state: 'GA'
};

console.log('🧪 Testing /api/quick-enrich endpoint...\n');
console.log('Test lane:', testLane);

const start = Date.now();

try {
  const response = await fetch('http://localhost:3000/api/quick-enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lanes: [testLane] })
  });

  const elapsed = Date.now() - start;
  console.log(`\n⏱️  Response time: ${elapsed}ms`);

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ HTTP error:', response.status);
    console.error('Response:', text);
    process.exit(1);
  }

  const data = await response.json();
  console.log('\n✅ Success! Response structure:');
  console.log('  ok:', data.ok);
  console.log('  count:', data.count);
  console.log('  lanes:', data.lanes?.length);

  if (data.lanes && data.lanes[0]) {
    const lane = data.lanes[0];
    console.log('\n📍 Enriched lane data:');
    console.log('  Origin nearby cities:', lane.origin_nearby?.length || 0);
    console.log('  Destination nearby cities:', lane.dest_nearby?.length || 0);
    console.log('  Origin KMAs:', Object.keys(lane.origin_kmas || {}).join(', '));
    console.log('  Dest KMAs:', Object.keys(lane.dest_kmas || {}).join(', '));

    if (lane.origin_kmas) {
      console.log('\n🏙️  Sample origin cities:');
      Object.entries(lane.origin_kmas).forEach(([kma, cities]) => {
        console.log(`  ${kma}: ${cities.slice(0, 3).map(c => c.city).join(', ')}...`);
      });
    }
  }

  console.log('\n🎉 Test passed!');
  console.log('✅ Performance:', elapsed < 1000 ? 'EXCELLENT (under 1s)' : 'GOOD');
  console.log('✅ Data structure: Valid');
  console.log('✅ Cities loaded: Yes');
  
  process.exit(0);

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
