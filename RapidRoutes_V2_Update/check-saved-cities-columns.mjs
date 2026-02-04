import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkColumns() {
  console.log('Checking for saved_origin_cities and saved_dest_cities columns...\n');
  
  // Get one lane to inspect structure
  const { data, error } = await adminSupabase
    .from('lanes')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No lanes found');
    return;
  }
  
  const lane = data[0];
  const hasOrigin = lane.hasOwnProperty('saved_origin_cities');
  const hasDestination = lane.hasOwnProperty('saved_dest_cities');
  
  console.log('Column Check:');
  console.log(`  saved_origin_cities: ${hasOrigin ? '✅ EXISTS' : '❌ MISSING'}`);
  console.log(`  saved_dest_cities: ${hasDestination ? '✅ EXISTS' : '❌ MISSING'}`);
  
  if (hasOrigin || hasDestination) {
    console.log('\nSample values:');
    console.log(`  saved_origin_cities: ${JSON.stringify(lane.saved_origin_cities || null)}`);
    console.log(`  saved_dest_cities: ${JSON.stringify(lane.saved_dest_cities || null)}`);
  }
  
  console.log('\nAll columns in lanes table:');
  console.log(Object.keys(lane).join(', '));
}

checkColumns();
