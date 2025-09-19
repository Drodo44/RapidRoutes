import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

async function analyzeCoverage() {
  console.log('Analyzing updated KMA coverage...');
  
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
    console.log('KMA codes:', Array.from(uniqueKmaCodes).sort().join(', '));
      
    // Show example KMA mappings
    console.log('\nKMA Code Samples:');
    console.log('----------------');
    const { data: samples } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .not('kma_code', 'is', null)
      .order('kma_code', { ascending: true })
      .limit(20);
      
    samples?.forEach(s => {
      console.log(`${s.kma_code}: ${s.city}, ${s.state_or_province}`);
    });
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeCoverage();

async function analyzeCoverage() {
  console.log('Analyzing updated KMA coverage...');
  
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
    console.log('KMA codes:', Array.from(uniqueKmaCodes).sort().join(', '));
      
      // Show example KMA mappings
      console.log('\nKMA Code Samples:');
      console.log('----------------');
      const { data: samples } = await supabase
        .from('cities')
        .select('city, state_or_province, kma_code')
        .not('kma_code', 'is', null)
        .order('kma_code', { ascending: true })
        .limit(20);
        
      samples?.forEach(s => {
        console.log(`${s.kma_code}: ${s.city}, ${s.state_or_province}`);
      });
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeCoverage();