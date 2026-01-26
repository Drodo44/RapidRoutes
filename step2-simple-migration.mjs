#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '389fa9a8-50e8-401f-a896-c9004ec99356';

console.log('\n=== STEP 2: ADD CREATED_BY COLUMNS (SIMPLIFIED) ===\n');

async function runMigration() {
  try {
    // Execute all SQL in one batch using direct SQL
    const sql = `
      -- Add columns
      ALTER TABLE blacklisted_cities ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
      ALTER TABLE city_corrections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
      ALTER TABLE preferred_pickups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
      
      -- Backfill data
      UPDATE blacklisted_cities SET created_by = '${USER_ID}' WHERE created_by IS NULL;
      UPDATE city_corrections SET created_by = '${USER_ID}' WHERE created_by IS NULL;
      UPDATE preferred_pickups SET created_by = '${USER_ID}' WHERE created_by IS NULL;
    `;
    
    console.log('🚀 Executing migration SQL...\n');
    
    // Note: exec_sql RPC function may not exist, so we'll need to execute via SQL editor
    // For now, let's just verify the tables exist
    
    console.log('✅ Migration SQL prepared. Now verifying table structures...\n');
    
    // Check if tables exist and their current state
    const tables = ['blacklisted_cities', 'city_corrections', 'preferred_pickups'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error(`❌ Error checking ${table}:`, error.message);
        } else {
          console.log(`✅ ${table}: ${count} rows found`);
        }
      } catch (err) {
        console.error(`❌ ${table}: ${err.message}`);
      }
    }
    
    console.log('\n📋 MANUAL STEP REQUIRED:\n');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('━'.repeat(70));
    console.log(sql);
    console.log('━'.repeat(70));
    console.log('\nAfter running the SQL, run: node step2-verify.mjs\n');
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

runMigration();
