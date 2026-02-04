// create-corrections-table.mjs
// Create city_corrections table in Supabase

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  console.log('=== CREATING CITY CORRECTIONS TABLE ===\n');
  
  const sql = readFileSync('./create-city-corrections-table.sql', 'utf8');
  
  // Execute SQL via RPC or direct query
  // Note: Supabase client doesn't support raw SQL execution directly
  // You'll need to run this in Supabase SQL Editor
  
  console.log('SQL to execute in Supabase SQL Editor:\n');
  console.log(sql);
  console.log('\n=== INSTRUCTIONS ===');
  console.log('1. Copy the SQL above');
  console.log('2. Go to Supabase Dashboard > SQL Editor');
  console.log('3. Paste and run the SQL');
  console.log('4. The city_corrections table will be created with initial data');
}

createTable().catch(console.error);
