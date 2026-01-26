// production-test.js - Test the live CSV export API after the fix
console.log('🚀 PRODUCTION CSV EXPORT TEST');
console.log('Testing live /api/exportDatCsv endpoint after function fix');
console.log('='.repeat(80));

async function testProductionExport() {
  try {
    // Test with localhost if running dev server, or use environment URL
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/exportDatCsv?pending=1&part=1`;
    
    console.log(`📍 Testing API endpoint: ${apiUrl}`);
    console.log('⏱️  Making request...');
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add any required auth headers here if needed
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ API RESPONSE SUCCESS:');
      console.log(`   Total Lanes: ${result.totalLanes || 'N/A'}`);
      console.log(`   Successful: ${result.successful || 'N/A'}`);
      console.log(`   Failed: ${result.failed || 'N/A'}`);
      console.log(`   Total Rows: ${result.totalRows || 'N/A'}`);
      console.log(`   Selected Rows: ${result.selectedRows || 'N/A'}`);
      console.log(`   CSV URL: ${result.url || 'N/A'}`);
      
      if (result.url) {
        console.log('\n📄 Fetching CSV content...');
        const csvUrl = result.url.startsWith('http') ? result.url : `${baseUrl}${result.url}`;
        const csvResponse = await fetch(csvUrl);
        const csvContent = await csvResponse.text();
        
        const lines = csvContent.split('\n').filter(line => line.trim());
        console.log(`   CSV Lines: ${lines.length}`);
        
        if (lines.length > 0) {
          console.log('\n📋 CSV HEADER:');
          console.log(`   ${lines[0]}`);
          
          if (lines.length > 1) {
            console.log('\n📋 SAMPLE CSV ROW:');
            console.log(`   ${lines[1]}`);
            
            // Parse the sample row to check date format and Reference ID
            const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
            const values = lines[1].split(',').map(v => v.replace(/"/g, ''));
            
            const rowObj = {};
            headers.forEach((header, i) => {
              rowObj[header] = values[i] || '';
            });
            
            console.log('\n🔍 KEY FIELD VALIDATION:');
            console.log(`   Pickup Earliest: "${rowObj['Pickup Earliest*']}" (should be MM/DD/YYYY)`);
            console.log(`   Pickup Latest: "${rowObj['Pickup Latest']}" (should be MM/DD/YYYY)`);
            console.log(`   Reference ID: "${rowObj['Reference ID']}" (should have max 1 consecutive zero)`);
            console.log(`   Origin City: "${rowObj['Origin City*']}"`);
            console.log(`   Destination City: "${rowObj['Destination City*']}"`);
            console.log(`   Equipment: "${rowObj['Equipment*']}"`);
            console.log(`   Contact Method: "${rowObj['Contact Method*']}"`);
            
            // Validate MM/DD/YYYY format
            const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
            const earliestValid = datePattern.test(rowObj['Pickup Earliest*']);
            const latestValid = !rowObj['Pickup Latest'] || datePattern.test(rowObj['Pickup Latest']);
            
            console.log('\n✅ VALIDATION RESULTS:');
            console.log(`   Date Format Valid: ${earliestValid && latestValid ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`   Has Content: ${Object.values(rowObj).filter(v => v.length > 0).length > 10 ? '✅ PASS' : '❌ FAIL'}`);
          }
        }
      }
      
      if (result.debug && result.debug.length > 0) {
        console.log('\n🐛 DEBUG LOGS (last 5):');
        result.debug.slice(-5).forEach(log => console.log(`   ${log}`));
      }
      
    } else {
      console.log('\n❌ API RESPONSE ERROR:');
      console.log(`   Error: ${result.error || 'Unknown error'}`);
      console.log(`   Details:`, result.details || result);
      
      if (result.debug && result.debug.length > 0) {
        console.log('\n🐛 ERROR DEBUG LOGS:');
        result.debug.forEach(log => console.log(`   ${log}`));
      }
    }
    
  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

testProductionExport().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log('🏁 PRODUCTION TEST COMPLETE');
  process.exit(0);
}).catch(error => {
  console.error('💥 PRODUCTION TEST CRASHED:', error.message);
  process.exit(1);
});
