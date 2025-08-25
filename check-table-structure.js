// check-table-structure.js - Check current lanes table structure
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log('Checking lanes table structure...');
  
  try {
    // Fetch a sample lane to see the columns
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching lanes:', error);
      return;
    }

    if (lanes && lanes.length > 0) {
      console.log('Available columns:');
      console.log(Object.keys(lanes[0]).join(', '));
      
      console.log('\nSample lane data:');
      console.log(lanes[0]);
    } else {
      console.log('No lanes found in table');
    }

  } catch (error) {
    console.error('Script failed:', error);
  }
}

checkTable();
