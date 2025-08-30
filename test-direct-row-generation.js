#!/usr/bin/env node
/**
 * DIRECT TEST: Row generation with fixed cities
 * Test the actual intelligent crawl pairs generation to see if it's working
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { generateIntelligentCrawlPairs } from './lib/intelligentCrawl.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRowGeneration() {
  console.log('🧪 DIRECT TEST: Row Generation with Fixed Cities');
  console.log('================================================');
  
  try {
    // Get the 12 active lanes
    const { data: lanes, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .limit(3); // Test with first 3 lanes for faster debugging
    
    if (laneError) {
      console.error('❌ Failed to get lanes:', laneError.message);
      return;
    }
    
    console.log(`\n📋 Testing ${lanes.length} active lanes:`);
    
    let totalRows = 0;
    const usedCities = new Set();
    
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      
      console.log(`\n--- Testing Lane ${i + 1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} ---`);
      
      try {
        // Test the intelligent crawl generation
        const crawl = await generateIntelligentCrawlPairs({
          origin: { city: lane.origin_city, state: lane.origin_state },
          destination: { city: lane.dest_city, state: lane.dest_state },
          equipment: lane.equipment_code,
          preferFillTo10: true, // Use fill mode for 12 rows per lane
          usedCities
        });
        
        console.log(`✅ Crawl generation successful:`);
        console.log(`   Base origin: ${crawl.baseOrigin?.city}, ${crawl.baseOrigin?.state}`);
        console.log(`   Base destination: ${crawl.baseDest?.city}, ${crawl.baseDest?.state}`);
        console.log(`   Pairs generated: ${crawl.pairs?.length || 0}`);
        console.log(`   Expected rows: ${crawl.pairs?.length || 0} pairs × 2 contacts + base pair × 2 = ${((crawl.pairs?.length || 0) + 1) * 2} rows`);
        
        const laneRows = ((crawl.pairs?.length || 0) + 1) * 2;
        totalRows += laneRows;
        
        // Show first few pairs
        if (crawl.pairs && crawl.pairs.length > 0) {
          console.log(`   Sample pairs:`);
          crawl.pairs.slice(0, 2).forEach((pair, j) => {
            console.log(`     ${j + 1}. ${pair.pickup?.city}, ${pair.pickup?.state} → ${pair.delivery?.city}, ${pair.delivery?.state}`);
          });
        } else {
          console.warn(`   ⚠️ No pairs generated for this lane!`);
        }
        
        if (crawl.insufficient) {
          console.warn(`   ⚠️ Insufficient crawl: ${crawl.message}`);
        }
        
      } catch (laneError) {
        console.error(`❌ Lane ${i + 1} failed:`, laneError.message);
        console.log(`   This lane would generate 0 rows`);
      }
    }
    
    console.log(`\n📊 GENERATION RESULTS:`);
    console.log(`======================`);
    console.log(`Lanes tested: ${lanes.length}`);
    console.log(`Total rows generated: ${totalRows}`);
    console.log(`Expected (12 per lane): ${lanes.length * 12}`);
    console.log(`Per-lane average: ${(totalRows / lanes.length).toFixed(1)} rows`);
    console.log(`Unique cities used: ${usedCities.size}`);
    
    if (totalRows < lanes.length * 12) {
      console.log(`\n⚠️ SHORTFALL ANALYSIS:`);
      console.log(`Missing rows: ${(lanes.length * 12) - totalRows}`);
      console.log(`Possible causes:`);
      console.log(`• Cities still missing from database`);
      console.log(`• Crawl generation logic issues`);
      console.log(`• HERE.com geocoding fallback not working`);
    } else {
      console.log(`\n🎉 SUCCESS! Row generation is working properly.`);
    }
    
    // Extrapolate to all 12 lanes
    if (lanes.length < 12) {
      const avgPerLane = totalRows / lanes.length;
      const projected12Lanes = Math.round(avgPerLane * 12);
      console.log(`\n📈 PROJECTION TO 12 LANES:`);
      console.log(`Average per lane: ${avgPerLane.toFixed(1)} rows`);
      console.log(`Projected for 12 lanes: ${projected12Lanes} rows`);
      console.log(`Expected improvement from current 118: ${projected12Lanes > 118 ? '+' : ''}${projected12Lanes - 118} rows`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRowGeneration();
