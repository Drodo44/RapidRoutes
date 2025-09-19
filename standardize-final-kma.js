// standardize-final-kma.js// standardize-final-kma.js

import dotenv from 'dotenv';import dotenv from 'dotenv';

dotenv.config();dotenv.config();



import { createClient } from '@supabase/supabase-js';import { createClient } from '@supabase/supabase-js';



const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';



const supabase = createClient(supabaseUrl, supabaseKey);const supabase = createClient(supabaseUrl, supabaseKey);



// Complete KMA code mapping for non-standard codes// KMA code mapping for non-standard codes

const kmaMapping = {const kmaMapping = {

  'AL_BIR': 'BHM', // Birmingham  'AL_BIR': 'BHM', // Birmingham

  'CA_LAX': 'LAX', // Los Angeles  'CA_LAX': 'LAX', // Los Angeles

  'TX_DAL': 'DFW', // Dallas  'TX_DAL': 'DFW', // Dallas

  'WI_MIL': 'MKE', // Milwaukee  // Add more mappings as needed

  'VA_ALE': 'WAS', // Washington DC};

  'WI_GRE': 'GRB', // Green Bay

  'SC_COL': 'CAE', // Columbiaasync function standardizeKMACodes() {

  'TX_MCA': 'MEX'  // Mexico City (Ciudad de México)  try {

};    console.log('🔧 KMA CODE STANDARDIZATION');

    

async function standardizeKMACodes() {    // Get cities with non-standard KMA codes

  try {    const { data: nonStandardCities, error: fetchError } = await supabase

    console.log('🔧 KMA CODE STANDARDIZATION');      .from('cities')

          .select('id, city, state_or_province, kma_code')

    // Get cities with non-standard KMA codes      .not('kma_code', 'is', null)

    const { data: nonStandardCities, error: fetchError } = await supabase      .not('kma_code', 'eq', '');

      .from('cities')    

      .select('id, city, state_or_province, kma_code')    if (fetchError) {

      .not('kma_code', 'is', null)      console.error('Failed to fetch cities:', fetchError);

      .not('kma_code', 'eq', '');      return false;

        }

    if (fetchError) {

      console.error('Failed to fetch cities:', fetchError);    // Filter for cities that need updating

      return false;    const citiesToUpdate = nonStandardCities.filter(city => {

    }      const kma = city.kma_code;

      return kma.length !== 3 || kma.includes('_') || !kma.match(/^[A-Z]{3}$/);

    // Filter for cities that need updating    });

    const citiesToUpdate = nonStandardCities.filter(city => {

      const kma = city.kma_code;    console.log(`Found ${citiesToUpdate.length} cities with non-standard KMA codes`);

      return kma.length !== 3 || kma.includes('_') || !kma.match(/^[A-Z]{3}$/);

    });    // Update each city

    for (const city of citiesToUpdate) {

    console.log(`Found ${citiesToUpdate.length} cities with non-standard KMA codes`);      const standardKMA = kmaMapping[city.kma_code];

      

    // Update each city      if (!standardKMA) {

    for (const city of citiesToUpdate) {        console.log(`⚠️ No mapping found for ${city.kma_code} (${city.city}, ${city.state_or_province})`);

      const standardKMA = kmaMapping[city.kma_code];        continue;

            }

      if (!standardKMA) {

        console.log(`⚠️ No mapping found for ${city.kma_code} (${city.city}, ${city.state_or_province})`);      const { error: updateError } = await supabase

        continue;        .from('cities')

      }        .update({ kma_code: standardKMA })

        .eq('id', city.id);

      const { error: updateError } = await supabase

        .from('cities')      if (updateError) {

        .update({ kma_code: standardKMA })        console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);

        .eq('id', city.id);      } else {

        console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code} -> ${standardKMA}`);

      if (updateError) {      }

        console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);    }

      } else {

        console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code} -> ${standardKMA}`);    return true;

      }  } catch (error) {

    }    console.error('Standardization failed:', error);

    return false;

    return true;  }

  } catch (error) {}

    console.error('Standardization failed:', error);

    return false;standardizeKMACodes()

  }  .then(success => {

}    if (success) {

      console.log('\n✅ Standardization complete');

standardizeKMACodes()      process.exit(0);

  .then(success => {    } else {

    if (success) {      console.log('\n❌ Standardization failed');

      console.log('\n✅ Standardization complete');      process.exit(1);

      process.exit(0);    }

    } else {  })

      console.log('\n❌ Standardization failed');  .catch(error => {

      process.exit(1);    console.error('Standardization crashed:', error);

    }    process.exit(1);

  })  });
  .catch(error => {
    console.error('Standardization crashed:', error);
    process.exit(1);
  });