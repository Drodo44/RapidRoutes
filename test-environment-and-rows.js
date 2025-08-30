#!/usr/bin/env node
/**
 * ENVIRONMENT TEST AND ROW ANALYSIS
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

console.log('🔧 ENVIRONMENT TEST AND ROW ANALYSIS');
console.log('====================================');

console.log('\n1. Environment Variables Check:');
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.log('\nEnvironment variables found:');
  Object.keys(process.env).filter(k => k.includes('SUPABASE')).forEach(k => {
    console.log(`${k}: ${process.env[k] ? 'SET' : 'MISSING'}`);
  });
  process.exit(1);
}

// Now import Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeRowGeneration() {
  try {
    console.log('\n2. Database Connection Test:');
    
    // Test basic connection with a simple query
    const { data: testData, error: testError, count } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return;
    }
    
    console.log(`✅ Database connected. Cities table has ${count} records`);
    
    console.log('\n3. Lane Analysis:');
    
    // Get all lanes
    const { data: lanes, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (laneError) {
      console.error('❌ Lane query failed:', laneError.message);
      return;
    }
    
    console.log(`✅ Found ${lanes.length} total lanes in database`);
    
    if (lanes.length === 0) {
      console.log('⚠️ No lanes found! This explains the row generation issue.');
      console.log('   Expected: 12 lanes × 12 rows = 144 rows');
      console.log('   Actual: 0 lanes × 12 rows = 0 rows');
      console.log('\n🔧 SOLUTION: Need to create test lanes first!');
      return;
    }
    
    // Analyze the lanes
    console.log('\n4. Lane Details:');
    lanes.slice(0, 5).forEach((lane, i) => {
      console.log(`   Lane ${i + 1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      console.log(`             ID: ${lane.id}, Equipment: ${lane.equipment_code}, Status: ${lane.status}`);
    });
    
    console.log('\n5. Row Generation Math:');
    console.log('========================');
    console.log(`Lanes in database: ${lanes.length}`);
    console.log(`Expected rows per lane: 12 (6 postings × 2 contact methods)`);
    console.log(`Total expected rows: ${lanes.length} × 12 = ${lanes.length * 12}`);
    console.log(`Reported actual rows: 118`);
    console.log(`Missing rows: ${(lanes.length * 12) - 118}`);
    
    if (lanes.length * 12 === 118) {
      console.log('✅ Math checks out - not a calculation issue');
    } else if (lanes.length < 12) {
      console.log(`⚠️ Only ${lanes.length} lanes, expected 12 for the test`);
      console.log('   This could partially explain the shortfall');
    }
    
    // Check for cities that might be missing
    console.log('\n6. City Availability Check:');
    for (let i = 0; i < Math.min(3, lanes.length); i++) {
      const lane = lanes[i];
      
      // Check origin city
      const { data: originCities } = await supabase
        .from('cities')
        .select('city, state_or_province')
        .ilike('city', lane.origin_city)
        .ilike('state_or_province', lane.origin_state)
        .limit(1);
      
      // Check destination city  
      const { data: destCities } = await supabase
        .from('cities')
        .select('city, state_or_province')
        .ilike('city', lane.dest_city)
        .ilike('state_or_province', lane.dest_state)
        .limit(1);
      
      const originFound = originCities && originCities.length > 0;
      const destFound = destCities && destCities.length > 0;
      
      console.log(`   Lane ${i + 1}:`);
      console.log(`     Origin: ${lane.origin_city}, ${lane.origin_state} ${originFound ? '✅' : '❌'}`);
      console.log(`     Dest: ${lane.dest_city}, ${lane.dest_state} ${destFound ? '✅' : '❌'}`);
      
      if (!originFound || !destFound) {
        console.log(`     ⚠️ Missing cities detected - this lane may fail to generate rows`);
      }
    }
    
    console.log('\n7. DIAGNOSIS SUMMARY:');
    console.log('=====================');
    
    if (lanes.length === 0) {
      console.log('🔥 ROOT CAUSE: No lanes in database');
      console.log('   SOLUTION: Create test lanes');
    } else if (lanes.length < 12) {
      console.log(`🔥 PARTIAL CAUSE: Only ${lanes.length} lanes, expected 12`);
      console.log('   SOLUTION: Create additional test lanes');
    } else {
      console.log('🔍 DEEPER INVESTIGATION NEEDED:');
      console.log('   - Check crawl generation logic');
      console.log('   - Verify city availability for all lanes');
      console.log('   - Test actual CSV export process');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

analyzeRowGeneration();
