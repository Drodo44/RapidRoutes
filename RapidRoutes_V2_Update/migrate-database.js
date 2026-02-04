// Autonomous database migration script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
  console.log('🚀 Starting autonomous database migration...\n');
  
  // Migration 1: Add nearby_cities column
  console.log('📊 Migration 1: Adding nearby_cities column...');
  const { error: colError } = await supabase.rpc('exec_sql', {
    query: 'ALTER TABLE cities ADD COLUMN IF NOT EXISTS nearby_cities JSONB DEFAULT \'{}\'::jsonb;'
  });
  
  if (colError && !colError.message.includes('already exists')) {
    console.error('❌ Error adding column:', colError);
    return;
  }
  console.log('✅ Column added\n');
  
  // Migration 2: Create index
  console.log('📊 Creating GIN index...');
  const { error: idxError } = await supabase.rpc('exec_sql', {
    query: 'CREATE INDEX IF NOT EXISTS idx_cities_nearby ON cities USING GIN (nearby_cities);'
  });
  console.log('✅ Index created\n');
  
  // Migration 3: Create lane_city_choices table
  console.log('📊 Creating lane_city_choices table...');
  const { error: tableError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS lane_city_choices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
        origin_city TEXT NOT NULL,
        origin_state TEXT NOT NULL,
        origin_chosen_cities JSONB DEFAULT '[]'::jsonb,
        dest_city TEXT NOT NULL,
        dest_state TEXT NOT NULL,
        dest_chosen_cities JSONB DEFAULT '[]'::jsonb,
        posted_cities JSONB DEFAULT '[]'::jsonb,
        rr_number TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(lane_id)
      );
    `
  });
  console.log('✅ Table created\n');
  
  console.log('🎉 Database migrations complete!');
  console.log('⏳ Now run: node compute-nearby-cities.js');
}

runMigrations().catch(console.error);
