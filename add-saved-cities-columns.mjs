import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addColumns() {
  console.log('Adding saved_origin_cities and saved_dest_cities columns...\n');
  
  try {
    // Add columns via raw SQL
    const { data, error } = await adminSupabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE lanes 
        ADD COLUMN IF NOT EXISTS saved_origin_cities JSONB DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS saved_dest_cities JSONB DEFAULT '[]';
      `
    });
    
    if (error) {
      // Fallback: Try direct query (may not work with Supabase RPC limitations)
      console.log('RPC failed, trying alternative method...');
      throw error;
    }
    
    console.log('✅ Columns added successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nNote: You may need to run this SQL directly in Supabase SQL Editor:');
    console.log(`
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS saved_origin_cities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS saved_dest_cities JSONB DEFAULT '[]';
    `);
  }
}

addColumns();
