import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function simpleFetch() {
  console.log('🔄 SIMPLE API TEST');
  console.log('Testing GET /api/exportDatCsv?pending=1');
  console.log('');

  try {
    console.log('⚡ Making request to localhost:3000...');
    
    const response = await fetch('http://localhost:3000/api/exportDatCsv?pending=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`📋 Response status: ${response.status}`);
    console.log(`📋 Response ok: ${response.ok}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }

    const result = await response.json();
    
    console.log('');
    console.log('✅ SUCCESS! API responded with:');
    console.log(`totalRows: ${result.totalRows}`);
    console.log(`error: ${result.error}`);
    console.log(`hasData: ${result.totalRows > 0}`);
    
    if (result.csvData) {
      const lines = result.csvData.split('\n');
      console.log(`CSV lines: ${lines.length}`);
      
      if (lines.length > 1 && lines[1].trim()) {
        const firstDataRow = lines[1].split(',');
        console.log('');
        console.log('📅 First row dates:');
        console.log(`pickup_earliest: "${firstDataRow[0]}"`);
        console.log(`pickup_latest: "${firstDataRow[1]}"`);
        
        const mmddyyyyRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
        console.log(`MM/DD/YYYY format: ${mmddyyyyRegex.test(firstDataRow[0]) && mmddyyyyRegex.test(firstDataRow[1])}`);
      }
    }

    console.log('');
    console.log('🎯 FINAL RESULTS:');
    console.log(`✅ totalRows > 0: ${result.totalRows > 0}`);
    console.log(`✅ error === null: ${result.error === null}`);
    console.log(`✅ API working: ${response.ok}`);

  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

simpleFetch();