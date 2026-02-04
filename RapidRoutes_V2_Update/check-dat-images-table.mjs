import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTable() {
  console.log('Checking dat_market_images table...\n');
  
  const { data, error } = await adminSupabase
    .from('dat_market_images')
    .select('*')
    .limit(1);
  
  if (error) {
    if (error.code === '42P01') {
      console.log('❌ Table does NOT exist. Need to create it.');
      console.log('\nRun this SQL in Supabase SQL Editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS dat_market_images (
  id BIGSERIAL PRIMARY KEY,
  equipment_type TEXT UNIQUE NOT NULL,
  image_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dat_market_images ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can view market images"
  ON dat_market_images FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Authenticated users can upload images"
  ON dat_market_images FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
      `);
    } else {
      console.error('Error checking table:', error);
    }
  } else {
    console.log('✅ Table exists!');
    console.log('Sample data:', data);
  }
}

checkTable();
