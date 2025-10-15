import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('Testing laneService import...');

try {
  // Import the TypeScript file directly  
  const { fetchLaneRecords } = await import('./services/laneService.ts');
  
  console.log('Import successful!');
  console.log('Calling fetchLaneRecords with limit=2...\n');
  
  const result = await fetchLaneRecords({ limit: 2 });
  
  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.length > 0) {
    console.log('\n\nFirst record details:');
    const first = result[0];
    console.log(`ID: ${first.id}`);
    console.log(`Origin: ${first.origin_city}, ${first.origin_state}`);
    console.log(`Destination: ${first.destination_city}, ${first.destination_state}`);
    console.log(`Equipment: ${first.equipment_code}`);
    console.log(`Origin KMA: ${first.origin_kma_code}`);
    console.log(`Dest KMA: ${first.destination_kma_code}`);
  }
  
} catch (error) {
  console.error('Error:', error);
  console.error('Stack:', error.stack);
}
