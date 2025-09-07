#!/usr/bin/env node

// Test the enhanced auto-RR storage system
import dotenv from 'dotenv';
dotenv.config();

// Ensure Node.js test environment
process.env.NODE_ENV = 'test';

console.log('Environment check:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

import { adminSupabase } from './utils/supabaseClient.js';
import { generateDatCsvRows } from './lib/datCsvBuilder.js';

async function testAutoRRSystem() {
  console.log('🧪 Testing Auto-RR Storage System...\n');
  
  try {
    // Get a few test lanes without reference IDs
    const { data: testLanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .is('reference_id', null)
      .limit(2);
    
    if (error) {
      console.error('❌ Failed to fetch test lanes:', error);
      return;
    }
    
    if (!testLanes || testLanes.length === 0) {
      console.log('ℹ️ No lanes without reference IDs found. Creating test lane...');
      
      // Create a test lane
      const { data: newLane, error: createError } = await adminSupabase
        .from('lanes')
        .insert({
          origin_city: 'Charlotte',
          origin_state: 'NC',
          dest_city: 'Atlanta',
          dest_state: 'GA',
          equipment_code: 'FD',
          length_ft: 48,
          weight_lbs: 25000,
          pickup_earliest: new Date().toISOString().split('T')[0],
          pickup_latest: new Date().toISOString().split('T')[0],
          full_partial: 'full',
          status: 'pending'
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create test lane:', createError);
        return;
      }
      
      testLanes = [newLane];
    }
    
    console.log(`📋 Testing with ${testLanes.length} lanes:`);
    testLanes.forEach(lane => {
      console.log(`   - Lane ${lane.id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      console.log(`     Current reference_id: ${lane.reference_id || 'NULL'}`);
    });
    
    console.log('\n🚀 Generating CSV rows with auto-RR storage...\n');
    
    for (const lane of testLanes) {
      console.log(`\n🔧 Processing Lane ${lane.id}...`);
      
      try {
        // Generate CSV rows (this should auto-store the RR number)
        const rows = await generateDatCsvRows(lane);
        console.log(`✅ Generated ${rows.length} CSV rows`);
        
        // Check the reference ID in the first row
        if (rows.length > 0) {
          const referenceId = rows[0]['Reference ID'];
          console.log(`📋 CSV Reference ID: ${referenceId}`);
        }
        
        // Check if the reference ID was stored in the database
        const { data: updatedLane, error: fetchError } = await adminSupabase
          .from('lanes')
          .select('reference_id')
          .eq('id', lane.id)
          .single();
        
        if (fetchError) {
          console.log(`❌ Failed to fetch updated lane: ${fetchError.message}`);
        } else {
          console.log(`💾 Database reference_id: ${updatedLane.reference_id || 'NULL'}`);
          
          if (updatedLane.reference_id) {
            console.log(`✅ SUCCESS: Reference ID automatically stored!`);
          } else {
            console.log(`❌ FAILED: Reference ID was not stored in database`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate CSV for lane ${lane.id}:`, error.message);
      }
    }
    
    console.log('\n🎯 Test completed!');
    console.log('\nNext steps:');
    console.log('1. Export CSV from the web interface');
    console.log('2. Search for lanes using RR numbers');
    console.log('3. Test recap functionality with RR numbers');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAutoRRSystem();
