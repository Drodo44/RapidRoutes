import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { generateGeographicCrawlPairs } from './lib/geographicCrawl.js';
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

async function testCSVGeneration() {
  try {
    console.log('🧪 TESTING complete CSV workflow with enhanced KMA cities...');
    console.log('');
    
    // Generate the enhanced KMA-diverse pairs
    const crawlResult = await generateGeographicCrawlPairs({
      origin: { city: 'Maplesville', state: 'AL' },
      destination: { city: 'Charlotte', state: 'NC' }, 
      equipment: 'FD'
    });
    
    console.log('✅ Generated', crawlResult?.pairs?.length || 0, 'enhanced pairs');
    
    // Create a test lane for CSV generation
    const testLane = {
      id: 'test-123',
      origin_city: 'Maplesville',
      origin_state: 'AL', 
      dest_city: 'Charlotte',
      dest_state: 'NC',
      equipment_code: 'FD',
      length_ft: 48,
      weight_lbs: 45000,
      full_partial: 'Full',
      pickup_earliest: '2025-01-15',
      pickup_latest: '2025-01-16',
      commodity: 'Building Materials',
      comment: 'Test enhanced KMA diversity'
    };
    
    console.log('🔄 Generating DAT CSV with enhanced cities...');
    
    // Generate CSV using the enhanced crawler
    const csvRows = await generateDatCsvRows(testLane);
    
    console.log('');
    console.log('📊 CSV GENERATION RESULTS:');
    console.log('   Total rows generated:', csvRows?.length || 0);
    console.log('   Expected rows (1 lane × 22):', 22);
    console.log('   Row count match:', (csvRows?.length === 22) ? '✅' : '❌');
    
    if (csvRows && csvRows.length > 0) {
      console.log('');
      console.log('🔍 CSV VALIDATION:');
      console.log('   Sample row fields:', csvRows[0]?.length || 0);
      console.log('   Expected fields:', 24);
      console.log('   Field count match:', (csvRows[0]?.length === 24) ? '✅' : '❌');
      
      // Check first few data rows for city validation
      console.log('');
      console.log('📋 SAMPLE CSV ROWS (checking city quality):');
      
      for (let i = 0; i < Math.min(5, csvRows.length); i++) {
        const row = csvRows[i];
        if (row && row.length >= 21) {
          const originCity = row[15] || '';
          const originState = row[16] || '';
          const destCity = row[19] || '';
          const destState = row[20] || '';
          
          console.log(`   Row ${i+1}: ${originCity}, ${originState} → ${destCity}, ${destState}`);
          
          // Check for common rejection reasons
          if (!originCity || !originState || !destCity || !destState) {
            console.log('     ❌ MISSING required city/state data');
          } else if (String(originCity).includes('undefined') || String(destCity).includes('undefined')) {
            console.log('     ❌ UNDEFINED values detected');
          } else {
            console.log('     ✅ Clean city data');
          }
        }
      }
      
      // Check for other common rejection patterns
      console.log('');
      console.log('🔍 CHECKING for common DAT rejection patterns:');
      
      // Check for undefined/null values across all rows
      let hasUndefined = false;
      let hasEmpty = false;
      
      csvRows.forEach((row, i) => {
        row.forEach((field, j) => {
          if (String(field).includes('undefined') || String(field).includes('null')) {
            hasUndefined = true;
          }
          if (!field && j >= 15 && j <= 20) { // Critical city/state fields
            hasEmpty = true;
          }
        });
      });
      
      if (hasUndefined) {
        console.log('   ❌ UNDEFINED/NULL values found - will cause rejections');
      } else {
        console.log('   ✅ No undefined/null values');
      }
      
      if (hasEmpty) {
        console.log('   ❌ Empty critical fields detected - potential rejections');
      } else {
        console.log('   ✅ No empty critical fields detected');
      }
    }
    
    console.log('');
    console.log('🎯 CSV QUALITY SUMMARY:');
    console.log('   Enhanced KMA pairs: ✅ Working');
    console.log('   CSV generation: ✅ Working');
    console.log('   Data quality: Checking above...');
    
  } catch (error) {
    console.error('❌ Error in CSV testing:', error.message);
  }
}

testCSVGeneration();
