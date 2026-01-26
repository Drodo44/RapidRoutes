import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

async function analyzeCoverage() {
  console.log('Analyzing KMA coverage...');
  
  try {
    // Get total cities
    const { data: totalCities } = await supabase
      .from('cities')
      .select('count')
      .single();
      
    // Get cities with KMAs
    const { data: citiesWithKma } = await supabase
      .from('cities')
      .select('count')
      .not('kma_code', 'is', null)
      .single();
      
    // Get unique KMAs
    const { data: uniqueKmas } = await supabase
      .from('cities')
      .select('kma_code')
      .not('kma_code', 'is', null);
    
    const uniqueKmaCodes = new Set(uniqueKmas.map(c => c.kma_code));
    
    console.log('\nDatabase Coverage Analysis:');
    console.log('--------------------------');
    console.log(`Total cities: ${totalCities.count}`);
    console.log(`Cities with KMA: ${citiesWithKma.count}`);
    console.log(`Coverage: ${((citiesWithKma.count / totalCities.count) * 100).toFixed(1)}%`);
    console.log(`Unique KMAs: ${uniqueKmaCodes.size}`);
    console.log('Unique KMA codes:', Array.from(uniqueKmaCodes).sort().join(', '));
    
    // Sample KMA distribution
    const { data: kmaDistribution } = await supabase
      .from('cities')
      .select('kma_code, count')
      .not('kma_code', 'is', null)
      .group('kma_code')
      .order('count', { ascending: false })
      .limit(10);
      
    console.log('\nTop 10 KMAs by city count:');
    console.log('-------------------------');
    kmaDistribution.forEach(k => {
      console.log(`${k.kma_code}: ${k.count} cities`);
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeCoverage();