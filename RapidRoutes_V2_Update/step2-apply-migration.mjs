#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n=== STEP 2: ADD CREATED_BY COLUMNS ===\n');

const USER_ID = '389fa9a8-50e8-401f-a896-c9004ec99356';

async function applyMigration() {
  console.log('🚀 Adding created_by columns to tables...\n');
  
  try {
    // Step 1: Add columns using ALTER TABLE
    console.log('1️⃣ Adding created_by to blacklisted_cities...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE blacklisted_cities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id)' 
    });
    
    console.log('2️⃣ Adding created_by to city_corrections...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE city_corrections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id)' 
    });
    
    console.log('3️⃣ Adding created_by to preferred_pickups...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE preferred_pickups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id)' 
    });
    
    console.log('\n✅ Columns added successfully!\n');
    console.log('� Backfilling existing data with your user ID...\n');
    
    // Step 2: Backfill data
    const { data: blacklistUpdate, error: blacklistError } = await supabase
      .from('blacklisted_cities')
      .update({ created_by: USER_ID })
      .is('created_by', null)
      .select();
    
    if (blacklistError) throw blacklistError;
    console.log(`   Updated ${blacklistUpdate?.length || 0} rows in blacklisted_cities`);
    
    const { data: correctionsUpdate, error: correctionsError } = await supabase
      .from('city_corrections')
      .update({ created_by: USER_ID })
      .is('created_by', null)
      .select();
    
    if (correctionsError) throw correctionsError;
    console.log(`   Updated ${correctionsUpdate?.length || 0} rows in city_corrections`);
    
    const { data: pickupsUpdate, error: pickupsError } = await supabase
      .from('preferred_pickups')
      .update({ created_by: USER_ID })
      .is('created_by', null)
      .select();
    
    if (pickupsError) throw pickupsError;
    console.log(`   Updated ${pickupsUpdate?.length || 0} rows in preferred_pickups`);
    
    console.log('\n✅ Backfill complete!\n');
    
    // Step 3: Verify changes
    console.log('🔍 Verifying changes...\n');
    
    // Check blacklisted_cities
    const { data: blacklistData, error: blacklistVerifyError } = await supabase
      .from('blacklisted_cities')
      .select('created_by', { count: 'exact' });
    
    if (blacklistVerifyError) {
      console.error('❌ Error checking blacklisted_cities:', blacklistVerifyError);
    } else {
      const withCreatedBy = blacklistData.filter(row => row.created_by).length;
      console.log(`blacklisted_cities: ${blacklistData.length} total rows, ${withCreatedBy} with created_by`);
    }
    
    // Check city_corrections
    const { data: correctionsData, error: correctionsVerifyError } = await supabase
      .from('city_corrections')
      .select('created_by', { count: 'exact' });
    
    if (correctionsVerifyError) {
      console.error('❌ Error checking city_corrections:', correctionsVerifyError);
    } else {
      const withCreatedBy = correctionsData.filter(row => row.created_by).length;
      console.log(`city_corrections: ${correctionsData.length} total rows, ${withCreatedBy} with created_by`);
    }
    
    // Check preferred_pickups
    const { data: pickupsData, error: pickupsVerifyError } = await supabase
      .from('preferred_pickups')
      .select('created_by', { count: 'exact' });
    
    if (pickupsVerifyError) {
      console.error('❌ Error checking preferred_pickups:', pickupsVerifyError);
    } else {
      const withCreatedBy = pickupsData.filter(row => row.created_by).length;
      console.log(`preferred_pickups: ${pickupsData.length} total rows, ${withCreatedBy} with created_by`);
    }
    
    console.log('\n✅ STEP 2 COMPLETE!\n');
    console.log('📋 Summary:');
    console.log('   - Added created_by columns to 3 tables');
    console.log('   - Backfilled all existing data with your user ID');
    console.log('   - All tables now ready for RLS policies\n');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

applyMigration();
