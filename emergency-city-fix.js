#!/usr/bin/env node
/**
 * EMERGENCY CITY FIX - Add missing cities immediately
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

async function emergencyFix() {
  console.log('🚨 EMERGENCY FIX: Adding missing cities NOW');
  console.log('===========================================');
  
  try {
    // Add Paradise, PA (Lancaster County, PA coordinates)
    console.log('\n1. Adding Paradise, PA...');
    const { data: paradiseData, error: paradiseError } = await supabase
      .from('cities')
      .insert([{
        city: 'Paradise',
        state_or_province: 'PA', 
        country: 'US',
        latitude: 40.0178,
        longitude: -76.1208,
        zip: '17562'
      }]);
      
    if (paradiseError) {
      if (paradiseError.message.includes('duplicate') || paradiseError.message.includes('unique')) {
        console.log('✅ Paradise, PA already exists or added');
      } else {
        console.error('❌ Paradise, PA error:', paradiseError.message);
      }
    } else {
      console.log('✅ Paradise, PA successfully added');
    }
    
    // Add McDavid, FL (Escambia County, FL coordinates)  
    console.log('\n2. Adding McDavid, FL...');
    const { data: mcdavidData, error: mcdavidError } = await supabase
      .from('cities')
      .insert([{
        city: 'McDavid',
        state_or_province: 'FL',
        country: 'US', 
        latitude: 30.8505,
        longitude: -87.2564,
        zip: '32568'
      }]);
      
    if (mcdavidError) {
      if (mcdavidError.message.includes('duplicate') || mcdavidError.message.includes('unique')) {
        console.log('✅ McDavid, FL already exists or added');
      } else {
        console.error('❌ McDavid, FL error:', mcdavidError.message);
      }
    } else {
      console.log('✅ McDavid, FL successfully added');
    }
    
    console.log('\n3. Verifying cities are now findable...');
    
    // Check Paradise, PA
    const { data: paradiseCheck } = await supabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude')
      .ilike('city', 'Paradise')
      .ilike('state_or_province', 'PA')
      .limit(1);
      
    console.log(`Paradise, PA verification: ${paradiseCheck && paradiseCheck.length > 0 ? '✅ FOUND' : '❌ STILL MISSING'}`);
    if (paradiseCheck && paradiseCheck.length > 0) {
      console.log(`   Location: ${paradiseCheck[0].city}, ${paradiseCheck[0].state_or_province} (${paradiseCheck[0].latitude}, ${paradiseCheck[0].longitude})`);
    }
    
    // Check McDavid, FL
    const { data: mcdavidCheck } = await supabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude')
      .ilike('city', 'McDavid')
      .ilike('state_or_province', 'FL')  
      .limit(1);
      
    console.log(`McDavid, FL verification: ${mcdavidCheck && mcdavidCheck.length > 0 ? '✅ FOUND' : '❌ STILL MISSING'}`);
    if (mcdavidCheck && mcdavidCheck.length > 0) {
      console.log(`   Location: ${mcdavidCheck[0].city}, ${mcdavidCheck[0].state_or_province} (${mcdavidCheck[0].latitude}, ${mcdavidCheck[0].longitude})`);
    }
    
    const citiesFixed = (paradiseCheck && paradiseCheck.length > 0 ? 1 : 0) + 
                       (mcdavidCheck && mcdavidCheck.length > 0 ? 1 : 0);
    
    console.log('\n📊 IMPACT CALCULATION:');
    console.log(`Cities successfully fixed: ${citiesFixed}/2`);
    console.log(`Problem lanes that should now work: ${citiesFixed === 2 ? '5 lanes' : 'partial'}`);
    console.log(`Expected additional rows: ${citiesFixed === 2 ? '60 rows (5 lanes × 12)' : 'partial improvement'}`);
    console.log(`New expected total: ${citiesFixed === 2 ? '118 + 60 = 178+ rows' : 'some improvement'}`);
    
    if (citiesFixed === 2) {
      console.log('\n🎉 SUCCESS! Both missing cities are now in the database.');
      console.log('The 12 active lanes should now generate closer to 144+ rows minimum.');
    } else {
      console.log('\n⚠️ Partial success. Some cities may still need manual intervention.');
    }
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

emergencyFix();
