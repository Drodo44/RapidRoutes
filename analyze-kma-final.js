// analyze-kma-final.js
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeKMACoverage() {
  try {
    console.log('🔍 KMA COVERAGE ANALYSIS');
    
    // Get total cities count
    const { count: totalCount, error: countError } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Failed to get total count:', countError);
      return false;
    }

    // Get cities with KMA codes
    const { data: citiesWithKMA, error: kmaError } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .not('kma_code', 'is', null)
      .not('kma_code', 'eq', '');
    
    if (kmaError) {
      console.error('Failed to get KMA cities:', kmaError);
      return false;
    }

    // Check for any non-standard KMA codes
    const nonStandardKMAs = citiesWithKMA.filter(city => {
      const kma = city.kma_code;
      return kma.length !== 3 || kma.includes('_') || !kma.match(/^[A-Z]{3}$/);
    });

    console.log(`
KMA Coverage Analysis:
Total Cities: ${totalCount}
Cities with KMA: ${citiesWithKMA.length}
Coverage: ${((citiesWithKMA.length / totalCount) * 100).toFixed(2)}%
Non-Standard KMAs Found: ${nonStandardKMAs.length}

${nonStandardKMAs.length > 0 ? `
Non-Standard KMA Examples:
${nonStandardKMAs.slice(0, 5).map(city => 
  `${city.city}, ${city.state_or_province}: ${city.kma_code}`
).join('\n')}` : 'All KMA codes are in standard format'}
    `);

    return true;
  } catch (error) {
    console.error('Analysis failed:', error);
    return false;
  }
}

analyzeKMACoverage()
  .then(success => {
    if (success) {
      console.log('\n✅ Analysis complete');
      process.exit(0);
    } else {
      console.log('\n❌ Analysis failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Analysis crashed:', error);
    process.exit(1);
  });