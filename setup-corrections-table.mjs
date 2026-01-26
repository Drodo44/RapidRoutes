// setup-corrections-table.mjs
// Create city_corrections table directly via Supabase admin

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTable() {
  console.log('=== SETTING UP CITY CORRECTIONS TABLE ===\n');
  
  // Check if table exists by trying to query it
  console.log('Checking if city_corrections table exists...');
  const { data: existingData, error: checkError } = await supabase
    .from('city_corrections')
    .select('id')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Table already exists!');
    console.log('Checking existing corrections...');
    
    const { data: corrections, error: fetchError } = await supabase
      .from('city_corrections')
      .select('*');
    
    if (!fetchError) {
      console.log(`\nCurrent corrections: ${corrections.length}`);
      corrections.forEach(c => {
        console.log(`  • ${c.incorrect_city}, ${c.incorrect_state} → ${c.correct_city}, ${c.correct_state}`);
      });
    }
    
    // Insert initial corrections if not present
    console.log('\nAdding initial corrections...');
    const { error: insertError } = await supabase
      .from('city_corrections')
      .insert([
        {
          incorrect_city: 'Sunny Side',
          incorrect_state: 'GA',
          correct_city: 'Sunnyside',
          correct_state: 'GA',
          notes: 'DAT rejected "Sunny Side" but accepted "Sunnyside"'
        }
      ])
      .select();
    
    if (insertError) {
      if (insertError.code === '23505') {
        console.log('  ⚠️  Initial correction already exists (skipped)');
      } else {
        console.error('  ❌ Error adding initial correction:', insertError.message);
      }
    } else {
      console.log('  ✅ Initial correction added');
    }
    
  } else if (checkError.code === '42P01') {
    console.log('❌ Table does not exist yet!');
    console.log('\nPlease run this SQL in Supabase Dashboard > SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(`
CREATE TABLE IF NOT EXISTS city_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incorrect_city TEXT NOT NULL,
  incorrect_state TEXT NOT NULL,
  correct_city TEXT NOT NULL,
  correct_state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(incorrect_city, incorrect_state)
);

CREATE INDEX IF NOT EXISTS idx_city_corrections_lookup 
ON city_corrections(incorrect_city, incorrect_state);

ALTER TABLE city_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view city corrections" 
ON city_corrections FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage corrections" 
ON city_corrections FOR ALL 
USING (auth.role() = 'authenticated');
`);
    console.log('----------------------------------------');
    console.log('\nThen run this script again to add initial data.');
  } else {
    console.error('❌ Unexpected error:', checkError);
  }
  
  console.log('\n=== SETUP COMPLETE ===');
  console.log('Access the admin UI at: http://localhost:3000/admin/city-corrections');
}

setupTable().catch(console.error);
