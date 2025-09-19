import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Complete KMA code mapping for non-standard codes
const kmaMapping = {
  'AL_BIR': 'BHM', // Birmingham
  'CA_LAX': 'LAX', // Los Angeles
  'TX_DAL': 'DFW', // Dallas
  'WI_MIL': 'MKE', // Milwaukee
  'VA_ALE': 'WAS', // Washington DC
  'WI_GRE': 'GRB', // Green Bay
  'SC_COL': 'CAE', // Columbia
  'TX_MCA': 'MEX'  // Mexico City (Ciudad de México)
};

async function standardizeKMACodes() {
  try {
    console.log('🔧 KMA CODE STANDARDIZATION');
    
    // Get cities with non-standard KMA codes
    const { data: nonStandardCities, error: fetchError } = await supabase
      .from('cities')
      .select('id, city, state_or_province, kma_code')
      .not('kma_code', 'is', null)
      .not('kma_code', 'eq', '');
    
    if (fetchError) {
      console.error('Failed to fetch cities:', fetchError);
      return false;
    }

    // Filter for cities that need updating
    const citiesToUpdate = nonStandardCities.filter(city => {
      const kma = city.kma_code;
      return kma.length !== 3 || kma.includes('_') || !kma.match(/^[A-Z]{3}$/);
    });

    console.log(`Found ${citiesToUpdate.length} cities with non-standard KMA codes`);

    // Update each city
    for (const city of citiesToUpdate) {
      const standardKMA = kmaMapping[city.kma_code];
      
      if (!standardKMA) {
        console.log(`⚠️ No mapping found for ${city.kma_code} (${city.city}, ${city.state_or_province})`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('cities')
        .update({ kma_code: standardKMA })
        .eq('id', city.id);

      if (updateError) {
        console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);
      } else {
        console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code} -> ${standardKMA}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Standardization failed:', error);
    return false;
  }
}

standardizeKMACodes()
  .then(success => {
    if (success) {
      console.log('\n✅ Standardization complete');
      process.exit(0);
    } else {
      console.log('\n❌ Standardization failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Standardization crashed:', error);
    process.exit(1);
  });