import { adminSupabase as supabase } from './utils/supabaseClient.js';

async function testLaneGeneration() {
  console.log('🚀 TESTING LANE GENERATION - PRODUCTION READY CHECK');
  
  try {
    // 1. Check database connection
    console.log('\n1. Testing database connection...');
    const { data: lanes, error: lanesError } = await supabase
      .from('lanes')
      .select('*')
      .limit(3);
      
    if (lanesError) {
      console.error('❌ Database error:', lanesError);
      return;
    }
    
    console.log(`✅ Found ${lanes.length} lanes in database`);
    
    if (lanes.length === 0) {
      console.log('❌ No lanes found. Cannot test generation.');
      return;
    }
    
    // 2. Test the export API directly
    console.log('\n2. Testing DAT CSV export API...');
    
    const testLane = lanes[0];
    console.log(`Testing with lane: ${testLane.origin_city}, ${testLane.origin_state} -> ${testLane.dest_city}, ${testLane.dest_state}`);
    
    try {
      const response = await fetch('http://localhost:3001/api/exportLaneCsv?id=' + testLane.id + '&preferFillTo10=true');
      
      if (!response.ok) {
        console.error(`❌ API request failed: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return;
      }
      
      const csvData = await response.text();
      console.log(`✅ CSV generated successfully!`);
      console.log(`📊 CSV length: ${csvData.length} characters`);
      
      // Parse the CSV to check rows
      const lines = csvData.split('\n').filter(line => line.trim());
      console.log(`📈 Total CSV lines: ${lines.length}`);
      console.log(`📋 Expected: Header + 22 data rows = 23 lines`);
      
      if (lines.length >= 10) {
        console.log('\n✅ Sample CSV content:');
        console.log('Header:', lines[0].substring(0, 100) + '...');
        console.log('First row:', lines[1].substring(0, 100) + '...');
        console.log('Last row:', lines[lines.length - 1].substring(0, 100) + '...');
        
        // Check for reference IDs
        const hasReferenceIds = csvData.includes('RR');
        console.log(`🆔 Reference IDs present: ${hasReferenceIds ? '✅' : '❌'}`);
        
        // Check for proper city generation
        const uniqueCities = new Set();
        lines.slice(1).forEach(line => {
          const columns = line.split(',');
          if (columns.length > 16) {
            uniqueCities.add(columns[15] + ', ' + columns[16]); // Origin city + state
          }
        });
        
        console.log(`🏙️ Unique origin cities generated: ${uniqueCities.size}`);
        console.log('Cities:', Array.from(uniqueCities).slice(0, 5).join('; ') + (uniqueCities.size > 5 ? '...' : ''));
        
        if (uniqueCities.size >= 5) {
          console.log('✅ LANE GENERATION IS WORKING! Multiple cities generated.');
        } else {
          console.log('⚠️ Only generated ' + uniqueCities.size + ' unique cities. Expected at least 5.');
        }
        
      }
      
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
    }
    
    // 3. Test bulk export
    console.log('\n3. Testing bulk export...');
    
    try {
      const bulkResponse = await fetch('http://localhost:3001/api/exportDatCsv?preferFillTo10=true&pending=true');
      
      if (bulkResponse.ok) {
        const bulkCsv = await bulkResponse.text();
        const bulkLines = bulkCsv.split('\n').filter(line => line.trim());
        console.log(`✅ Bulk export successful: ${bulkLines.length} total lines`);
        
        const expectedMinRows = lanes.length * 10; // At least 10 rows per lane
        if (bulkLines.length >= expectedMinRows) {
          console.log(`✅ Row count looks good: ${bulkLines.length} >= ${expectedMinRows}`);
        } else {
          console.log(`⚠️ Row count may be low: ${bulkLines.length} < ${expectedMinRows}`);
        }
        
      } else {
        console.error(`❌ Bulk export failed: ${bulkResponse.status}`);
      }
    } catch (bulkError) {
      console.error('❌ Bulk export error:', bulkError.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLaneGeneration();
