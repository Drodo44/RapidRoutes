#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n=== STEP 2 VERIFICATION ===\n');

async function verify() {
  const tables = [
    'lanes',
    'blacklisted_cities',
    'city_corrections',
    'preferred_pickups'
  ];
  
  console.log('Checking created_by columns and data...\n');
  
  for (const table of tables) {
    try {
      // Try to select created_by column
      const { data, error } = await supabase
        .from(table)
        .select('created_by')
        .limit(5);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        const total = data.length;
        const withCreatedBy = data.filter(row => row.created_by).length;
        const withoutCreatedBy = total - withCreatedBy;
        
        if (withoutCreatedBy === 0) {
          console.log(`✅ ${table}: All rows have created_by (checked ${total} rows)`);
        } else {
          console.log(`⚠️  ${table}: ${withCreatedBy}/${total} rows have created_by`);
        }
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
  
  console.log('\n');
}

verify();
