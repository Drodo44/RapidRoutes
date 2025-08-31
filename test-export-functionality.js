// Test actual DAT CSV export functionality
import { adminSupabase } from './utils/supabaseClient.js';

async function testDatExport() {
  console.log('🧪 TESTING DAT CSV EXPORT FUNCTIONALITY');
  
  try {
    // Get one pending lane
    const { data: lanes, error: lanesError } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .limit(1);
      
    if (lanesError) {
      console.log('❌ Error fetching lanes:', lanesError.message);
      return;
    }
    
    if (lanes.length === 0) {
      console.log('⚠️ No pending lanes found. Creating a test lane...');
      
      // Create a test lane
      const testLane = {
        origin_city: 'Atlanta',
        origin_state: 'GA',
        origin_zip: '30309',
        dest_city: 'Nashville',
        dest_state: 'TN', 
        dest_zip: '37203',
        equipment_code: 'FD',
        length_ft: 48,
        weight_lbs: 47000,
        full_partial: 'full',
        pickup_earliest: '9/1/2025',
        pickup_latest: '9/2/2025',
        commodity: 'General Freight',
        comment: 'Test lane for finalization',
        status: 'pending'
      };
      
      const { data: newLane, error: insertError } = await adminSupabase
        .from('lanes')
        .insert(testLane)
        .select()
        .single();
        
      if (insertError) {
        console.log('❌ Error creating test lane:', insertError.message);
        return;
      }
      
      console.log('✅ Created test lane:', newLane.id);
      lanes.push(newLane);
    }
    
    console.log(`📋 Testing with lane: ${lanes[0].origin_city}, ${lanes[0].origin_state} -> ${lanes[0].dest_city}, ${lanes[0].dest_state}`);
    
    // Test the export API directly
    const response = await fetch('http://localhost:3000/api/exportDatCsv?preferFillTo10=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Export API failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return;
    }
    
    const csvData = await response.text();
    const lines = csvData.split('\n');
    
    console.log('✅ DAT CSV Export Success!');
    console.log(`📊 Total CSV lines: ${lines.length}`);
    console.log(`📋 Headers: ${lines[0]}`);
    console.log(`📋 First data row: ${lines[1]}`);
    console.log(`📋 Expected rows per lane: ${(lines.length - 1) / lanes.length} rows`);
    
    // Verify header count (should be 24)
    const headers = lines[0].split(',');
    console.log(`📊 Header count: ${headers.length} (should be 24)`);
    
    if (headers.length === 24) {
      console.log('✅ Header count is correct!');
    } else {
      console.log('❌ Header count is incorrect!');
    }
    
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

testDatExport();
