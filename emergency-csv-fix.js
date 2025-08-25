// emergency-csv-fix.js
// Quick fix for CSV formatting and duplication issues

import { adminSupabase } from './utils/supabaseClient.js';

async function fixCsvIssues() {
  try {
    console.log('🚨 EMERGENCY CSV FIX: Checking for duplicate lanes...');
    
    // Get all pending/posted lanes
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .in('status', ['pending', 'posted'])
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Found ${lanes.length} active lanes`);
    
    // Check for exact duplicates (same origin, destination, equipment)
    const seen = new Map();
    const duplicates = [];
    
    lanes.forEach(lane => {
      const key = `${lane.origin_city.toLowerCase()},${lane.origin_state.toLowerCase()}->${lane.dest_city.toLowerCase()},${lane.dest_state.toLowerCase()}-${lane.equipment_code}`;
      
      if (seen.has(key)) {
        const original = seen.get(key);
        console.log(`🔄 DUPLICATE FOUND:`);
        console.log(`   Original: ${original.id} - ${original.origin_city}, ${original.origin_state} → ${original.dest_city}, ${original.dest_state} (${original.equipment_code}) - ${original.created_at}`);
        console.log(`   Duplicate: ${lane.id} - ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code}) - ${lane.created_at}`);
        duplicates.push(lane.id);
      } else {
        seen.set(key, lane);
      }
    });
    
    if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate lanes`);
      console.log('Duplicate IDs:', duplicates);
      
      // Optionally remove duplicates (uncomment if needed)
      // console.log('🗑️ Removing duplicates...');
      // const { error: deleteError } = await adminSupabase
      //   .from('lanes')
      //   .delete()
      //   .in('id', duplicates);
      // 
      // if (deleteError) {
      //   console.error('Error removing duplicates:', deleteError);
      // } else {
      //   console.log('✅ Duplicates removed');
      // }
    } else {
      console.log('✅ No duplicates found');
    }
    
    // Check reference ID formatting
    console.log('\n🆔 Checking reference ID formatting...');
    const badRefIds = lanes.filter(lane => {
      const refId = lane.reference_id;
      return refId && (refId.includes('="') || refId.includes('"'));
    });
    
    console.log(`Found ${badRefIds.length} lanes with Excel-formatted reference IDs`);
    badRefIds.forEach(lane => {
      console.log(`   - ${lane.id}: "${lane.reference_id}"`);
    });
    
  } catch (error) {
    console.error('Emergency fix error:', error.message);
  }
  
  process.exit(0);
}

fixCsvIssues();
