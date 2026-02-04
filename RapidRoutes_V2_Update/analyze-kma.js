import { adminSupabase } from './utils/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

async function analyzeCoverage() {
  console.log('Analyzing KMA coverage...');
  
  try {
    // Get total cities
    const { data: totalCities } = await adminSupabase
      .from('cities')
      .select('count')
      .single();
      
    // Get cities with KMAs
    const { data: citiesWithKma } = await adminSupabase
      .from('cities')
      .select('count')
      .not('kma_code', 'is', null)
      .single();
      
    // Get unique KMAs
    const { data: uniqueKmas } = await adminSupabase
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
    const { data: kmaDistribution } = await adminSupabase
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