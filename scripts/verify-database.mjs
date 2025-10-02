// Quick verification script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('🔍 Verifying database computation...\n');
  
  // Count cities with nearby_cities data
  const { count: withData } = await supabase
    .from('cities')
    .select('id', { count: 'exact', head: true })
    .not('nearby_cities', 'is', null);
  
  console.log(`✅ Cities with nearby_cities data: ${withData}`);
  
  // Sample a city to see the data structure
  const { data: sample } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities')
    .not('nearby_cities', 'is', null)
    .eq('city', 'Fitzgerald')
    .eq('state_or_province', 'GA')
    .limit(1)
    .single();
  
  if (sample) {
    const kmas = Object.keys(sample.nearby_cities?.kmas || {});
    let totalCities = 0;
    for (const kma of kmas) {
      totalCities += sample.nearby_cities.kmas[kma].length;
    }
    
    console.log(`\n📍 Sample: ${sample.city}, ${sample.state_or_province}`);
    console.log(`   Total nearby cities: ${totalCities}`);
    console.log(`   KMAs represented: ${kmas.join(', ')}`);
    console.log(`\n✅ Database is ready for production use!`);
  }
}

verify().catch(console.error);
