const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from('cities')
    .select('city, state_or_province, nearby_cities')
    .eq('city', 'Fitzgerald')
    .eq('state_or_province', 'GA')
    .maybeSingle();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data) {
    console.log('Fitzgerald, GA not found in database!');
    return;
  }
  
  console.log('Fitzgerald, GA data:');
  console.log('City:', data.city);
  console.log('State:', data.state_or_province);
  console.log('\nnearby_cities structure:', JSON.stringify(data.nearby_cities, null, 2));
  
  if (data.nearby_cities?.kmas) {
    console.log('\nKMA Breakdown:');
    for (const kma in data.nearby_cities.kmas) {
      console.log(`  ${kma}: ${data.nearby_cities.kmas[kma].length} cities`);
    }
    
    const totalCities = Object.values(data.nearby_cities.kmas).reduce((sum, arr) => sum + arr.length, 0);
    console.log('\nTotal cities within 100 miles:', totalCities);
  }
})();
