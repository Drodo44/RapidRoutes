// Test reference ID generation consistency
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://vrnmdqbhxpqbhebcclsz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybm1kcWJoeHBxYmhlYmNjbHN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDI2NTc3MSwiZXhwIjoyMDQ1ODQxNzcxfQ.5UKZUfKFP7b7Cgh5m3IH6EcDaE8Jt3F5vq_mqrJeUkQ'
);

// CSV generation logic from datCsvBuilder.js
function generateRefIdCSV(laneId) {
  const laneIdStr = String(laneId);
  const numericPart = laneIdStr.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
  const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
  return `RR${referenceNum}`;
}

// Recap page logic
function generateRefIdRecap(laneId) {
  const laneIdStr = String(laneId);
  const numericPart = laneIdStr.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
  const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
  return `RR${referenceNum}`;
}

async function testReferenceGeneration() {
  try {
    console.log('🔍 Testing reference ID generation consistency...\n');
    
    // Get some sample lanes
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('id, reference_id, origin_city, dest_city, status')
      .limit(5);
    
    if (error) {
      console.error('Error fetching lanes:', error);
      return;
    }
    
    console.log('Sample lanes and reference IDs:\n');
    
    lanes.forEach((lane, index) => {
      console.log(`--- LANE ${index + 1} ---`);
      console.log(`Lane ID: ${lane.id}`);
      console.log(`Stored reference_id: ${lane.reference_id}`);
      console.log(`Route: ${lane.origin_city} → ${lane.dest_city}`);
      console.log(`Status: ${lane.status}`);
      
      const csvRef = generateRefIdCSV(lane.id);
      const recapRef = generateRefIdRecap(lane.id);
      
      console.log(`Generated (CSV):   ${csvRef}`);
      console.log(`Generated (Recap): ${recapRef}`);
      console.log(`Match CSV/Recap:   ${csvRef === recapRef ? '✅' : '❌'}`);
      console.log(`Match Stored:      ${(lane.reference_id === csvRef) ? '✅' : '❌'}`);
      
      // Show breakdown
      const laneIdStr = String(lane.id);
      const parts = laneIdStr.split('-');
      const firstPart = parts[0];
      const numericOnly = firstPart.replace(/[a-f]/g, '');
      const first5 = numericOnly.substring(0,5) || '10000';
      const parsed = parseInt(first5, 10) || 10000;
      const modulo = parsed % 100000;
      const padded = String(modulo).padStart(5, '0');
      
      console.log(`Breakdown: ${laneIdStr} → ${parts[0]} → ${numericOnly} → ${first5} → ${parsed} → ${modulo} → RR${padded}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testReferenceGeneration();
