import 'dotenv/config';

async function testLaneGeneration() {
  console.log('🧪 Testing Lane Generation and Export\n');
  
  try {
    // Test the export API with a specific lane
    console.log('🎯 Testing DAT CSV export API...');
    
    // First, check if we can get a CSV export
    const response = await fetch('http://localhost:3000/api/exportDatCsv?days=30&preferFillTo10=true');
    
    if (response.ok) {
      const csv = await response.text();
      console.log('✅ Export API responded successfully');
      console.log(`📄 CSV Length: ${csv.length} characters`);
      
      // Check CSV structure
      const lines = csv.split('\n').filter(line => line.trim());
      console.log(`📊 CSV has ${lines.length} lines`);
      
      if (lines.length > 0) {
        console.log('\n📋 CSV Header:');
        console.log(lines[0]);
        
        if (lines.length > 1) {
          console.log('\n📋 First data row:');
          console.log(lines[1]);
          
          // Count rows per lane (should be 22 per lane with proper crawling)
          const dataRows = lines.length - 1; // Subtract header
          console.log(`\n🔢 Data rows: ${dataRows}`);
          console.log(`🧮 Estimated lanes: ${Math.round(dataRows / 22)} (assuming 22 rows per lane)`);
        }
      }
      
      console.log('\n✅ Lane generation appears to be working!');
      
    } else {
      console.log(`❌ Export API failed with status: ${response.status}`);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
    
    // Test a single lane export
    console.log('\n🎯 Testing single lane export...');
    const singleResponse = await fetch('http://localhost:3000/api/exportLaneCsv/1?preferFillTo10=true');
    
    if (singleResponse.ok) {
      const singleCsv = await singleResponse.text();
      const singleLines = singleCsv.split('\n').filter(line => line.trim());
      console.log(`✅ Single lane export successful: ${singleLines.length} lines`);
      
      // Should have header + data rows
      const expectedRows = singleLines.length - 1;
      console.log(`📊 Data rows for single lane: ${expectedRows}`);
      
      if (expectedRows >= 12 && expectedRows <= 22) {
        console.log('✅ Row count looks correct for lane generation');
      } else {
        console.log('⚠️  Row count outside expected range (12-22)');
      }
    } else {
      console.log(`❌ Single lane export failed: ${singleResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLaneGeneration();
