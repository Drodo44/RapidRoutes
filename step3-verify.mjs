#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n=== STEP 3: TEAM-BASED RLS VERIFICATION ===\n');

async function verify() {
  try {
    // Check profiles table
    console.log('1️⃣ Checking profiles table structure...\n');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'aconnellan@tql.com')
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
    } else {
      console.log('Your profile:');
      console.log('  Email:', profile.email);
      console.log('  Role:', profile.role);
      console.log('  Organization ID:', profile.organization_id || '❌ MISSING');
      console.log('  Team Role:', profile.team_role || '❌ MISSING');
      console.log('  Is Org Owner:', profile.organization_id === profile.id ? '✅ Yes' : '❌ No');
      console.log('');
    }
    
    // Check data tables
    console.log('2️⃣ Checking data tables...\n');
    
    const tables = ['lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('organization_id, created_by')
        .limit(5);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        const total = data.length;
        const withOrgId = data.filter(row => row.organization_id).length;
        const withCreatedBy = data.filter(row => row.created_by).length;
        
        if (withOrgId === total && withCreatedBy === total) {
          console.log(`✅ ${table}: All ${total} rows have both organization_id and created_by`);
        } else {
          console.log(`⚠️  ${table}: ${withOrgId}/${total} with org_id, ${withCreatedBy}/${total} with created_by`);
        }
      }
    }
    
    console.log('\n3️⃣ Checking RLS policies...\n');
    
    // Check if policies exist (they won't be active until RLS is enabled)
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, policyname 
          FROM pg_policies 
          WHERE schemaname = 'public' 
          AND tablename IN ('lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups')
          ORDER BY tablename, policyname;
        `
      });
    
    if (policyError) {
      console.log('⚠️  Could not check policies (this is OK, they might not exist yet)');
    } else {
      const policyCount = policies?.length || 0;
      if (policyCount > 0) {
        console.log(`✅ Found ${policyCount} RLS policies created`);
      } else {
        console.log('⚠️  No RLS policies found yet');
      }
    }
    
    console.log('\n📋 Summary:\n');
    console.log('If all checks show ✅, Step 3 is complete!');
    console.log('If you see ❌ or ⚠️, you need to run the Step 3 SQL in Supabase.\n');
    
  } catch (err) {
    console.error('❌ Verification error:', err.message);
  }
}

verify();
