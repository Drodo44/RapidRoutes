#!/usr/bin/env node
/**
 * MISSING CITIES DETECTOR AND FIXER
 * 
 * This will find all lanes with missing cities and fix them systematically.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findMissingCities() {
  console.log('🔍 SYSTEMATIC MISSING CITIES DETECTION');
  console.log('======================================');
  
  try {
    // Get all lanes
    const { data: lanes, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (laneError) {
      console.error('❌ Failed to get lanes:', laneError.message);
      return;
    }
    
    console.log(`\n📊 Analyzing ${lanes.length} lanes for missing cities...`);
    
    const missingCities = [];
    const problemLanes = [];
    
    // Check each lane
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      
      // Check origin city
      const { data: originCities } = await supabase
        .from('cities')
        .select('city, state_or_province, latitude, longitude')
        .ilike('city', lane.origin_city)
        .ilike('state_or_province', lane.origin_state)
        .limit(1);
      
      const originFound = originCities && originCities.length > 0;
      
      // Check destination city
      const { data: destCities } = await supabase
        .from('cities')
        .select('city, state_or_province, latitude, longitude')  
        .ilike('city', lane.dest_city)
        .ilike('state_or_province', lane.dest_state)
        .limit(1);
      
      const destFound = destCities && destCities.length > 0;
      
      // Track missing cities
      if (!originFound) {
        const cityKey = `${lane.origin_city}, ${lane.origin_state}`;
        if (!missingCities.find(c => c.key === cityKey)) {
          missingCities.push({
            key: cityKey,
            city: lane.origin_city,
            state: lane.origin_state,
            type: 'origin'
          });
        }
      }
      
      if (!destFound) {
        const cityKey = `${lane.dest_city}, ${lane.dest_state}`;
        if (!missingCities.find(c => c.key === cityKey)) {
          missingCities.push({
            key: cityKey,
            city: lane.dest_city,
            state: lane.dest_state,
            type: 'destination'
          });
        }
      }
      
      // Track problematic lanes
      if (!originFound || !destFound) {
        problemLanes.push({
          id: lane.id,
          lane: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
          originMissing: !originFound,
          destMissing: !destFound,
          equipment: lane.equipment_code,
          status: lane.status
        });
      }
    }
    
    console.log(`\n🔍 ANALYSIS RESULTS:`);
    console.log(`Total lanes: ${lanes.length}`);
    console.log(`Problem lanes: ${problemLanes.length}`);
    console.log(`Unique missing cities: ${missingCities.length}`);
    
    console.log(`\n❌ MISSING CITIES (${missingCities.length}):`);
    missingCities.forEach((city, i) => {
      console.log(`${i + 1}. ${city.city}, ${city.state}`);
    });
    
    console.log(`\n⚠️ PROBLEM LANES (${problemLanes.length}):`);
    problemLanes.forEach((lane, i) => {
      console.log(`${i + 1}. ${lane.lane} (${lane.equipment})`);
      if (lane.originMissing) console.log(`    ❌ Origin missing`);
      if (lane.destMissing) console.log(`    ❌ Destination missing`);
    });
    
    // Calculate impact
    const impactRows = problemLanes.length * 12; // Each problem lane loses 12 rows
    console.log(`\n📊 ROW GENERATION IMPACT:`);
    console.log(`Problem lanes: ${problemLanes.length}`);
    console.log(`Lost rows: ${problemLanes.length} × 12 = ${impactRows} rows`);
    console.log(`Working lanes: ${lanes.length - problemLanes.length}`);
    console.log(`Generated rows: ${(lanes.length - problemLanes.length) * 12} rows`);
    
    if ((lanes.length - problemLanes.length) * 12 === 118) {
      console.log(`✅ This explains the 118 rows exactly!`);
    }
    
    // Generate HERE.com API calls to fix missing cities
    console.log(`\n🔧 HERE.com GEOCODING SOLUTIONS:`);
    console.log(`================================`);
    
    for (const city of missingCities) {
      const geocodeUrl = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(city.city + ', ' + city.state)}&apiKey=YOUR_API_KEY`;
      console.log(`\nFix ${city.city}, ${city.state}:`);
      console.log(`curl "${geocodeUrl}"`);
    }
    
    return { missingCities, problemLanes, impactRows };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run the analysis
findMissingCities();
