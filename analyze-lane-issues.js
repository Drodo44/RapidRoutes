#!/usr/bin/env node

import { adminSupabase } from './utils/supabaseClient.js';

async function analyzeLaneIssues() {
  try {
    console.log('🔍 Analyzing lane generation issues...\n');
    
    // Get pending lanes (what the export API looks for by default)
    const { data: pendingLanes, error: pendingError } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .limit(10);
    
    console.log('📊 Pending lanes:', pendingLanes?.length || 0);
    if (pendingError) console.error('Pending lane error:', pendingError);
    
    // Get all lanes to see status distribution
    const { data: allLanes, error: allError } = await adminSupabase
      .from('lanes')
      .select('status, weight_lbs, equipment_code, randomize_weight, weight_min, weight_max')
      .limit(100);
    
    if (allError) {
      console.error('All lanes error:', allError);
      return;
    }
    
    console.log(`📈 Total lanes sampled: ${allLanes?.length || 0}`);
    
    // Analyze status distribution
    const statusCounts = {};
    const weightIssues = [];
    const equipmentIssues = [];
    
    allLanes?.forEach((lane, i) => {
      // Count statuses
      statusCounts[lane.status] = (statusCounts[lane.status] || 0) + 1;
      
      // Check weight issues
      if (lane.randomize_weight) {
        if (!lane.weight_min || !lane.weight_max || lane.weight_min >= lane.weight_max) {
          weightIssues.push(`Lane ${i+1}: Invalid randomization range (min: ${lane.weight_min}, max: ${lane.weight_max})`);
        }
      } else {
        if (!lane.weight_lbs || lane.weight_lbs <= 0) {
          weightIssues.push(`Lane ${i+1}: Missing or invalid weight_lbs: ${lane.weight_lbs}`);
        }
      }
      
      // Check equipment issues
      if (!lane.equipment_code) {
        equipmentIssues.push(`Lane ${i+1}: Missing equipment_code`);
      }
    });
    
    console.log('\n🚦 Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} lanes`);
    });
    
    console.log('\n⚠️ Weight Issues:');
    if (weightIssues.length === 0) {
      console.log('   ✅ No weight issues found');
    } else {
      weightIssues.slice(0, 10).forEach(issue => console.log(`   ${issue}`));
      if (weightIssues.length > 10) {
        console.log(`   ... and ${weightIssues.length - 10} more`);
      }
    }
    
    console.log('\n🚛 Equipment Issues:');
    if (equipmentIssues.length === 0) {
      console.log('   ✅ No equipment issues found');
    } else {
      equipmentIssues.slice(0, 5).forEach(issue => console.log(`   ${issue}`));
    }
    
    // Test a specific lane export
    if (pendingLanes?.length > 0) {
      console.log('\n🧪 Testing export with first pending lane...');
      const testLane = pendingLanes[0];
      console.log('Test lane:', {
        id: testLane.id,
        origin: `${testLane.origin_city}, ${testLane.origin_state}`,
        dest: `${testLane.dest_city}, ${testLane.dest_state}`,
        weight: testLane.weight_lbs,
        randomize: testLane.randomize_weight,
        equipment: testLane.equipment_code,
        status: testLane.status
      });
    }
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
  }
}

analyzeLaneIssues();
