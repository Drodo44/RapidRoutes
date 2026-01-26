// scripts/kma-zip-mapper.js
import { adminSupabase } from '../utils/supabaseClient.js';
import xlsx from 'xlsx';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const KMA_MAPPINGS = {
  // Example structure we'll populate from Excel:
  // 'AL_BIR': { // Birmingham
  //   ranges: [
  //     { start: '350', end: '352' },
  //     { start: '354', end: '354' },
  //   ],
  //   name: 'Birmingham'
  // }
};

async function loadKMAZipRanges() {
  try {
    const workbook = xlsx.readFile('/workspaces/RapidRoutes/KMA Zip RateView 3.0.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log('📚 Loading KMA ZIP ranges...');
    
    rows.forEach(row => {
      const kmaCode = row['KMA Code'];
      const kmaName = row['Market Name'];
      const zipRange = row['ZIP Range'];
      
      if (!kmaCode || !zipRange) return;
      
      if (!KMA_MAPPINGS[kmaCode]) {
        KMA_MAPPINGS[kmaCode] = {
          ranges: [],
          name: kmaName
        };
      }
      
      // Handle both single ZIPs and ranges (e.g., "350-352")
      if (zipRange.includes('-')) {
        const [start, end] = zipRange.split('-');
        KMA_MAPPINGS[kmaCode].ranges.push({ start, end });
      } else {
        KMA_MAPPINGS[kmaCode].ranges.push({ 
          start: zipRange, 
          end: zipRange 
        });
      }
    });

    console.log(`✅ Loaded ${Object.keys(KMA_MAPPINGS).length} KMA regions`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load KMA ZIP ranges:', error);
    return false;
  }
}

function findKMAForZip(zip) {
  const zip3 = zip.substring(0, 3);
  
  for (const [kmaCode, kma] of Object.entries(KMA_MAPPINGS)) {
    for (const range of kma.ranges) {
      if (zip3 >= range.start && zip3 <= range.end) {
        return {
          kma_code: kmaCode,
          kma_name: kma.name
        };
      }
    }
  }
  return null;
}

async function updateCityKMAs() {
  try {
    console.log('🔄 Starting KMA assignment update...');

    // Get all cities
    const { data: cities, error } = await adminSupabase
      .from('cities')
      .select('*');

    if (error) throw error;
    
    console.log(`📊 Processing ${cities.length} cities...`);
    
    let updates = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const city of cities) {
      if (!city.zip) {
        skipped++;
        continue;
      }
      
      const kma = findKMAForZip(city.zip);
      if (!kma) {
        console.log(`⚠️ No KMA found for ${city.city}, ${city.state_or_province} (ZIP: ${city.zip})`);
        failed++;
        continue;
      }
      
      // Only update if KMA is different or missing
      if (city.kma_code !== kma.kma_code || !city.kma_name) {
        const { error: updateError } = await adminSupabase
          .from('cities')
          .update({
            kma_code: kma.kma_code,
            kma_name: kma.name,
            kma_verified: true
          })
          .eq('id', city.id);

        if (updateError) {
          console.error(`❌ Failed to update ${city.city}:`, updateError.message);
          failed++;
        } else {
          updates++;
        }
      }
    }

    console.log('\n📈 Update Summary:');
    console.log(`Total cities processed: ${cities.length}`);
    console.log(`Updated: ${updates}`);
    console.log(`Skipped (no ZIP): ${skipped}`);
    console.log(`Failed: ${failed}`);

    // Verify KMA coverage
    const { data: kmaStats, error: statsError } = await adminSupabase
      .from('cities')
      .select('state_or_province, kma_code')
      .not('kma_code', 'is', null);

    if (!statsError) {
      const stateKMAs = {};
      kmaStats.forEach(city => {
        if (!stateKMAs[city.state_or_province]) {
          stateKMAs[city.state_or_province] = new Set();
        }
        stateKMAs[city.state_or_province].add(city.kma_code);
      });

      console.log('\n📊 KMA Coverage by State:');
      Object.entries(stateKMAs)
        .sort(([,a], [,b]) => b.size - a.size)
        .forEach(([state, kmas]) => {
          console.log(`${state}: ${kmas.size} unique KMAs`);
        });
    }

  } catch (error) {
    console.error('❌ Update process failed:', error);
  }
}

// Run the update process
async function main() {
  const loaded = await loadKMAZipRanges();
  if (loaded) {
    await updateCityKMAs();
  }
}

main();