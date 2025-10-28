import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBristol() {
  console.log('Checking Bristol, PA in cities table...\n');
  
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('city', 'Bristol')
    .eq('state_or_province', 'PA');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Results:', JSON.stringify(data, null, 2));
  
  if (data && data.length > 0) {
    const bristol = data[0];
    console.log('\nBristol city record:');
    console.log('- City:', bristol.city);
    console.log('- State:', bristol.state_or_province);
    console.log('- ZIP:', bristol.zip);
    console.log('- Latitude:', bristol.latitude);
    console.log('- Longitude:', bristol.longitude);
    console.log('- Has coords:', !!(bristol.latitude && bristol.longitude));
    
    // Check if ZIP3 exists
    if (bristol.zip) {
      const zip3 = bristol.zip.toString().slice(0, 3);
      console.log('\nChecking ZIP3 table for', zip3);
      
      const { data: zip3Data, error: zip3Error } = await supabase
        .from('zip3_kma_geo')
        .select('*')
        .eq('zip3', zip3)
        .maybeSingle();
      
      if (zip3Error) {
        console.error('ZIP3 lookup error:', zip3Error);
      } else if (zip3Data) {
        console.log('ZIP3 data:', JSON.stringify(zip3Data, null, 2));
      } else {
        console.log('No ZIP3 data found for', zip3);
      }
    }
  } else {
    console.log('\nNo Bristol, PA found in cities table');
  }
}

checkBristol();
