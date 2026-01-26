#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying Save City Choices Functionality\n');

// Test 1: Check if lane_city_choices table exists
console.log('1️⃣  Checking lane_city_choices table...');
const { data: tableCheck, error: tableError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .limit(1);

if (tableError) {
  console.log('❌ Table does not exist or has permission issues:', tableError.message);
  console.log('\n🔧 Creating table...');
  
  const { error: createError } = await supabase.rpc('exec_sql', {
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
  
  if (createError) {
    console.log('❌ Failed to create table:', createError.message);
    console.log('\n💡 You need to run this SQL manually in Supabase SQL Editor:');
    console.log(`
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
    `);
  } else {
    console.log('✅ Table created successfully');
  }
} else {
  console.log('✅ Table exists');
  console.log(`   Current records: ${tableCheck?.length || 0}`);
}

// Test 2: Check if get_next_rr_number function exists
console.log('\n2️⃣  Checking get_next_rr_number function...');
const { data: rrData, error: rrError } = await supabase.rpc('get_next_rr_number');

if (rrError) {
  console.log('❌ Function does not exist:', rrError.message);
  console.log('\n🔧 Creating function...');
  
  const { error: funcError } = await supabase.rpc('exec_sql', {
    query: `
      CREATE OR REPLACE FUNCTION get_next_rr_number()
      RETURNS TEXT AS $$
      DECLARE
        max_num INTEGER;
        next_num INTEGER;
      BEGIN
        SELECT COALESCE(MAX(CAST(SUBSTRING(rr_number FROM 3) AS INTEGER)), 0)
        INTO max_num
        FROM lane_city_choices
        WHERE rr_number ~ '^RR[0-9]+$';
        
        next_num := max_num + 1;
        RETURN 'RR' || LPAD(next_num::TEXT, 5, '0');
      END;
      $$ LANGUAGE plpgsql;
    `
  });
  
  if (funcError) {
    console.log('❌ Failed to create function:', funcError.message);
    console.log('\n💡 You need to run this SQL manually in Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE FUNCTION get_next_rr_number()
RETURNS TEXT AS $$
DECLARE
  max_num INTEGER;
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(rr_number FROM 3) AS INTEGER)), 0)
  INTO max_num
  FROM lane_city_choices
  WHERE rr_number ~ '^RR[0-9]+$';
  
  next_num := max_num + 1;
  RETURN 'RR' || LPAD(next_num::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
    `);
  } else {
    console.log('✅ Function created successfully');
  }
} else {
  console.log('✅ Function exists');
  console.log(`   Next RR number: ${rrData}`);
}

// Test 3: Check pending lanes
console.log('\n3️⃣  Checking pending lanes...');
const { data: lanes, error: lanesError } = await supabase
  .from('lanes')
  .select('id, origin_city, origin_state, destination_city, destination_state, dest_city, dest_state')
  .eq('lane_status', 'pending')
  .limit(5);

if (lanesError) {
  console.log('❌ Error fetching lanes:', lanesError.message);
} else {
  console.log(`✅ Found ${lanes.length} pending lanes`);
  lanes.forEach((lane, idx) => {
    const dest = lane.destination_city || lane.dest_city;
    const destState = lane.destination_state || lane.dest_state;
    console.log(`   ${idx + 1}. ${lane.origin_city}, ${lane.origin_state} → ${dest}, ${destState}`);
  });
}

// Test 4: Check for existing saved choices
console.log('\n4️⃣  Checking for saved city choices...');
const { data: savedChoices, error: savedError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .limit(10);

if (savedError) {
  console.log('❌ Error fetching saved choices:', savedError.message);
} else {
  console.log(`✅ Found ${savedChoices.length} saved choice records`);
  savedChoices.forEach((choice, idx) => {
    console.log(`   ${idx + 1}. ${choice.rr_number}: ${choice.origin_city} → ${choice.dest_city}`);
    console.log(`      Origin choices: ${choice.origin_chosen_cities?.length || 0}`);
    console.log(`      Dest choices: ${choice.dest_chosen_cities?.length || 0}`);
  });
}

console.log('\n✅ Verification complete!');
