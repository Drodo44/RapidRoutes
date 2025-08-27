#!/usr/bin/env node

// Query actual lanes from RapidRoutes database for testing
import { adminSupabase } from './utils/supabaseClient.js';

async function getLanesFromDatabase() {
  console.log('🔍 QUERYING ACTUAL LANES FROM RAPIDROUTES DATABASE');
  console.log('=' .repeat(60));

  try {
    // Get recent lanes with different statuses and equipment types
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select(`
        id, 
        origin_city, 
        origin_state, 
        dest_city, 
        dest_state, 
        equipment_code, 
        status,
        created_at,
        weight_lbs,
        pickup_earliest
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Database Error:', error);
      return [];
    }

    if (!lanes || lanes.length === 0) {
      console.log('⚠️ No lanes found in database');
      return [];
    }

    console.log(`📊 Found ${lanes.length} lanes in database:`);
    console.log('');

    // Group by equipment type and status for better organization
    const equipmentGroups = {};
    const statusGroups = {};

    lanes.forEach(lane => {
      const eq = lane.equipment_code || 'Unknown';
      const status = lane.status || 'Unknown';
      
      if (!equipmentGroups[eq]) equipmentGroups[eq] = [];
      if (!statusGroups[status]) statusGroups[status] = [];
      
      equipmentGroups[eq].push(lane);
      statusGroups[status].push(lane);
    });

    console.log('📈 EQUIPMENT TYPE BREAKDOWN:');
    Object.entries(equipmentGroups).forEach(([eq, lanesOfType]) => {
      console.log(`   ${eq}: ${lanesOfType.length} lanes`);
    });
    console.log('');

    console.log('📊 STATUS BREAKDOWN:');
    Object.entries(statusGroups).forEach(([status, lanesOfStatus]) => {
      console.log(`   ${status}: ${lanesOfStatus.length} lanes`);
    });
    console.log('');

    // Show sample lanes for testing
    console.log('🎯 SAMPLE LANES FOR INTELLIGENT GUARANTEE TESTING:');
    console.log('');

    const testCandidates = [];
    
    // Select diverse lanes for testing
    const uniqueRoutes = new Set();
    
    for (const lane of lanes) {
      const routeKey = `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`;
      
      if (!uniqueRoutes.has(routeKey) && testCandidates.length < 10) {
        uniqueRoutes.add(routeKey);
        testCandidates.push({
          id: lane.id,
          origin: { city: lane.origin_city, state: lane.origin_state },
          destination: { city: lane.dest_city, state: lane.dest_state },
          equipment: lane.equipment_code,
          status: lane.status,
          created: new Date(lane.created_at).toLocaleDateString(),
          weight: lane.weight_lbs,
          route: routeKey
        });
      }
    }

    testCandidates.forEach((lane, i) => {
      console.log(`${i + 1}. ${lane.route}`);
      console.log(`   Equipment: ${lane.equipment} | Status: ${lane.status} | Weight: ${lane.weight || 'Random'} lbs`);
      console.log(`   Created: ${lane.created} | ID: ${lane.id}`);
      console.log('');
    });

    return testCandidates;

  } catch (error) {
    console.error('❌ Error querying lanes:', error);
    return [];
  }
}

// Export for use in tests
export { getLanesFromDatabase };

// Run if called directly
if (process.env.NODE_ENV !== 'test') {
  getLanesFromDatabase().catch(console.error);
}
