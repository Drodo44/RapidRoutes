#!/usr/bin/env node

import { adminSupabase } from './utils/supabaseClient.js';

async function testDB() {
  try {
    console.log('🔍 Testing database connectivity...');
    
    // Test lanes table
    const { data: lanes, error: laneError } = await adminSupabase
      .from('lanes')
      .select('*')
      .limit(3);
    
    console.log('📊 Sample lanes:', lanes?.length || 0);
    if (laneError) console.error('Lane error:', laneError);
    
    if (lanes?.[0]) {
      console.log('📍 First lane:', {
        id: lanes[0].id,
        origin: `${lanes[0].origin_city}, ${lanes[0].origin_state}`,
        dest: `${lanes[0].dest_city}, ${lanes[0].dest_state}`,
        weight: lanes[0].weight_lbs,
        equipment: lanes[0].equipment_code,
        status: lanes[0].status
      });
    }
    
    // Test cities table  
    const { data: cities, error: cityError } = await adminSupabase
      .from('cities')
      .select('*')
      .limit(3);
    
    console.log('🏙️ Sample cities:', cities?.length || 0);
    if (cityError) console.error('City error:', cityError);
    
    if (cities?.[0]) {
      console.log('🌆 First city:', {
        city: cities[0].city,
        state: cities[0].state_or_province,
        zip: cities[0].zip,
        kma: cities[0].kma_code
      });
    }
    
    // Test preferred_pickups table
    const { data: pickups, error: pickupError } = await adminSupabase
      .from('preferred_pickups')
      .select('*')
      .limit(3);
    
    console.log('🚛 Sample preferred pickups:', pickups?.length || 0);
    if (pickupError) console.error('Pickup error:', pickupError);
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

testDB();
