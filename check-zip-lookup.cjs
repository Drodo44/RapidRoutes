const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkZip() {
  console.log('Checking ZIP 19007 and ZIP3 190...\n');
  
  // Check full ZIP
  const { data: fullZip, error: fullError } = await supabase
    .from('zip3_kma_geo')
    .select('*')
    .eq('zip', '19007')
    .maybeSingle();
  
  console.log('Full ZIP (19007):', fullError ? `Error: ${fullError.message}` : fullZip || 'Not found');
  
  // Check ZIP3
  const { data: zip3, error: zip3Error } = await supabase
    .from('zip3_kma_geo')
    .select('*')
    .eq('zip', '190')
    .maybeSingle();
  
  console.log('\nZIP3 (190):', zip3Error ? `Error: ${zip3Error.message}` : zip3 || 'Not found');
  
  // Check if table has any data
  const { data: sample, error: sampleError, count } = await supabase
    .from('zip3_kma_geo')
    .select('*', { count: 'exact' })
    .limit(5);
  
  console.log('\nTable row count:', count);
  console.log('Sample rows:', sampleError ? `Error: ${sampleError.message}` : sample);
}

checkZip().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
