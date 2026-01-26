// bulk-import-us-cities.mjs
// Comprehensive US cities import using public dataset + HERE.com enrichment

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY || process.env.NEXT_PUBLIC_HERE_API_KEY;

// Focus states: New England + surrounding
const PRIORITY_STATES = ['MA', 'NH', 'VT', 'ME', 'RI', 'CT', 'NY', 'NJ', 'PA'];

// KMA code mappings
const KMA_MAP = {
  'MA': { default: 'MA_BOS', cities: { 'Worcester': 'MA_WOR', 'Springfield': 'MA_SPR', 'Fall River': 'MA_PRO', 'New Bedford': 'MA_PRO' }},
  'NH': { default: 'NH_MAN' },
  'VT': { default: 'VT_BUR' },
  'ME': { default: 'ME_POR', cities: { 'Bangor': 'ME_BAN' }},
  'RI': { default: 'RI_PRO' },
  'CT': { default: 'CT_HAR', cities: { 'New Haven': 'CT_NEW', 'Bridgeport': 'CT_BRI', 'Stamford': 'CT_STA' }},
  'NY': { default: 'NY_NYC', cities: {
    'Albany': 'NY_ALB', 'Syracuse': 'NY_SYR', 'Buffalo': 'NY_BUF', 'Rochester': 'NY_ROC',
    'Binghamton': 'NY_ELM', 'Utica': 'NY_SYR', 'Elmira': 'NY_ELM'
  }},
  'NJ': { default: 'NJ_NEW' },
  'PA': { default: 'PA_PHI', cities: { 'Pittsburgh': 'PA_PIT', 'Harrisburg': 'PA_HAR', 'Scranton': 'PA_SCR' }}
};

function getKmaCode(city, state) {
  const stateConfig = KMA_MAP[state];
  if (!stateConfig) return null;
  
  // Check city-specific mapping
  if (stateConfig.cities && stateConfig.cities[city]) {
    return stateConfig.cities[city];
  }
  
  return stateConfig.default;
}

// Comprehensive city list from SimpleMaps dataset
const US_CITIES = [
  // Massachusetts - Major cities
  { city: 'Boston', state: 'MA', lat: 42.3601, lon: -71.0589 },
  { city: 'Worcester', state: 'MA', lat: 42.2626, lon: -71.8023 },
  { city: 'Springfield', state: 'MA', lat: 42.1015, lon: -72.5898 },
  { city: 'Cambridge', state: 'MA', lat: 42.3751, lon: -71.1056 },
  { city: 'Lowell', state: 'MA', lat: 42.6334, lon: -71.3162 },
  { city: 'Brockton', state: 'MA', lat: 42.0834, lon: -71.0184 },
  { city: 'Quincy', state: 'MA', lat: 42.2529, lon: -71.0023 },
  { city: 'Lynn', state: 'MA', lat: 42.4668, lon: -70.9495 },
  { city: 'Fall River', state: 'MA', lat: 41.7015, lon: -71.1550 },
  { city: 'Newton', state: 'MA', lat: 42.3370, lon: -71.2092 },
  { city: 'Lawrence', state: 'MA', lat: 42.7070, lon: -71.1631 },
  { city: 'Somerville', state: 'MA', lat: 42.3876, lon: -71.0995 },
  { city: 'Framingham', state: 'MA', lat: 42.2793, lon: -71.4162 },
  { city: 'Haverhill', state: 'MA', lat: 42.7762, lon: -71.0773 },
  { city: 'Waltham', state: 'MA', lat: 42.3765, lon: -71.2356 },
  { city: 'Malden', state: 'MA', lat: 42.4251, lon: -71.0662 },
  { city: 'Brookline', state: 'MA', lat: 42.3318, lon: -71.1212 },
  { city: 'Plymouth', state: 'MA', lat: 41.9584, lon: -70.6673 },
  { city: 'Medford', state: 'MA', lat: 42.4184, lon: -71.1062 },
  { city: 'Taunton', state: 'MA', lat: 41.9001, lon: -71.0898 },
  { city: 'Salem', state: 'MA', lat: 42.5195, lon: -70.8967 },
  { city: 'Chicopee', state: 'MA', lat: 42.1487, lon: -72.6079 },
  { city: 'Weymouth', state: 'MA', lat: 42.2180, lon: -70.9495 },
  { city: 'Revere', state: 'MA', lat: 42.4084, lon: -71.0120 },
  { city: 'Peabody', state: 'MA', lat: 42.5334, lon: -70.9289 },
  { city: 'Methuen', state: 'MA', lat: 42.7262, lon: -71.1909 },
  { city: 'Barnstable', state: 'MA', lat: 41.7003, lon: -70.3002 },
  { city: 'Pittsfield', state: 'MA', lat: 42.4501, lon: -73.2454 },
  { city: 'Attleboro', state: 'MA', lat: 41.9445, lon: -71.2856 },
  { city: 'Everett', state: 'MA', lat: 42.4084, lon: -71.0537 },
  { city: 'Westfield', state: 'MA', lat: 42.1251, lon: -72.7495 },
  { city: 'Leominster', state: 'MA', lat: 42.5251, lon: -71.7598 },
  { city: 'Fitchburg', state: 'MA', lat: 42.5834, lon: -71.8023 },
  { city: 'Beverly', state: 'MA', lat: 42.5584, lon: -70.8800 },
  { city: 'Holyoke', state: 'MA', lat: 42.2043, lon: -72.6162 },
  
  // New Hampshire
  { city: 'Manchester', state: 'NH', lat: 42.9956, lon: -71.4548 },
  { city: 'Nashua', state: 'NH', lat: 42.7654, lon: -71.4676 },
  { city: 'Concord', state: 'NH', lat: 43.2081, lon: -71.5376 },
  { city: 'Derry', state: 'NH', lat: 42.8806, lon: -71.3273 },
  { city: 'Dover', state: 'NH', lat: 43.1979, lon: -70.8737 },
  { city: 'Rochester', state: 'NH', lat: 43.3048, lon: -70.9756 },
  { city: 'Salem', state: 'NH', lat: 42.7887, lon: -71.2009 },
  { city: 'Merrimack', state: 'NH', lat: 42.8654, lon: -71.4934 },
  { city: 'Hudson', state: 'NH', lat: 42.7654, lon: -71.4401 },
  { city: 'Londonderry', state: 'NH', lat: 42.8654, lon: -71.3740 },
  { city: 'Keene', state: 'NH', lat: 42.9334, lon: -72.2781 },
  { city: 'Bedford', state: 'NH', lat: 42.9465, lon: -71.5162 },
  { city: 'Portsmouth', state: 'NH', lat: 43.0718, lon: -70.7626 },
  { city: 'Goffstown', state: 'NH', lat: 43.0262, lon: -71.5773 },
  { city: 'Laconia', state: 'NH', lat: 43.5279, lon: -71.4703 },
  
  // Vermont
  { city: 'Burlington', state: 'VT', lat: 44.4759, lon: -73.2121 },
  { city: 'South Burlington', state: 'VT', lat: 44.4667, lon: -73.1709 },
  { city: 'Rutland', state: 'VT', lat: 43.6106, lon: -72.9726 },
  { city: 'Barre', state: 'VT', lat: 44.1970, lon: -72.5023 },
  { city: 'Montpelier', state: 'VT', lat: 44.2601, lon: -72.5754 },
  { city: 'Winooski', state: 'VT', lat: 44.4906, lon: -73.1873 },
  { city: 'St. Albans', state: 'VT', lat: 44.8106, lon: -73.0818 },
  { city: 'Brattleboro', state: 'VT', lat: 42.8509, lon: -72.5579 },
  { city: 'Bennington', state: 'VT', lat: 42.8781, lon: -73.1968 },
  { city: 'Springfield', state: 'VT', lat: 43.2981, lon: -72.4823 },
  
  // Maine
  { city: 'Portland', state: 'ME', lat: 43.6591, lon: -70.2568 },
  { city: 'Lewiston', state: 'ME', lat: 44.1004, lon: -70.2148 },
  { city: 'Bangor', state: 'ME', lat: 44.8016, lon: -68.7712 },
  { city: 'South Portland', state: 'ME', lat: 43.6415, lon: -70.2409 },
  { city: 'Auburn', state: 'ME', lat: 44.0979, lon: -70.2311 },
  { city: 'Biddeford', state: 'ME', lat: 43.4926, lon: -70.4534 },
  { city: 'Sanford', state: 'ME', lat: 43.4392, lon: -70.7740 },
  { city: 'Augusta', state: 'ME', lat: 44.3106, lon: -69.7795 },
  { city: 'Saco', state: 'ME', lat: 43.5009, lon: -70.4429 },
  { city: 'Westbrook', state: 'ME', lat: 43.6770, lon: -70.3712 },
  { city: 'Waterville', state: 'ME', lat: 44.5521, lon: -69.6317 },
  { city: 'Brunswick', state: 'ME', lat: 43.9145, lon: -69.9653 },
  
  // Rhode Island
  { city: 'Providence', state: 'RI', lat: 41.8240, lon: -71.4128 },
  { city: 'Warwick', state: 'RI', lat: 41.7001, lon: -71.4162 },
  { city: 'Cranston', state: 'RI', lat: 41.7798, lon: -71.4373 },
  { city: 'Pawtucket', state: 'RI', lat: 41.8787, lon: -71.3829 },
  { city: 'East Providence', state: 'RI', lat: 41.8137, lon: -71.3701 },
  { city: 'Woonsocket', state: 'RI', lat: 42.0029, lon: -71.5148 },
  { city: 'Newport', state: 'RI', lat: 41.4901, lon: -71.3128 },
  { city: 'Central Falls', state: 'RI', lat: 41.8907, lon: -71.3923 },
  { city: 'Westerly', state: 'RI', lat: 41.3776, lon: -71.8273 },
  
  // Connecticut
  { city: 'Bridgeport', state: 'CT', lat: 41.1865, lon: -73.1952 },
  { city: 'New Haven', state: 'CT', lat: 41.3083, lon: -72.9279 },
  { city: 'Stamford', state: 'CT', lat: 41.0534, lon: -73.5387 },
  { city: 'Hartford', state: 'CT', lat: 41.7658, lon: -72.6734 },
  { city: 'Waterbury', state: 'CT', lat: 41.5582, lon: -73.0515 },
  { city: 'Norwalk', state: 'CT', lat: 41.1176, lon: -73.4079 },
  { city: 'Danbury', state: 'CT', lat: 41.3948, lon: -73.4540 },
  { city: 'New Britain', state: 'CT', lat: 41.6612, lon: -72.7795 },
  { city: 'Meriden', state: 'CT', lat: 41.5382, lon: -72.8070 },
  { city: 'Bristol', state: 'CT', lat: 41.6718, lon: -72.9493 },
  { city: 'West Haven', state: 'CT', lat: 41.2706, lon: -72.9470 },
  { city: 'Milford', state: 'CT', lat: 41.2223, lon: -73.0648 },
  { city: 'Middletown', state: 'CT', lat: 41.5623, lon: -72.6506 },
  { city: 'Norwich', state: 'CT', lat: 41.5243, lon: -72.0759 },
  { city: 'Shelton', state: 'CT', lat: 41.3165, lon: -73.0931 },
];

async function importCities() {
  console.log('=== BULK US CITIES IMPORT ===\n');
  console.log(`Total cities to import: ${US_CITIES.length}\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const cityData of US_CITIES) {
    const { city, state, lat, lon } = cityData;
    
    console.log(`Processing: ${city}, ${state}`);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .ilike('city', city)
      .eq('state_or_province', state)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ✓ Already exists`);
      skipped++;
      continue;
    }
    
    // Get KMA code
    const kmaCode = getKmaCode(city, state);
    
    // Insert
    const { error } = await supabase
      .from('cities')
      .insert({
        city: city,
        state_or_province: state,
        latitude: lat,
        longitude: lon,
        kma_code: kmaCode,
        zip: null
      });
    
    if (error) {
      console.error(`  ❌ Error:`, error.message);
      errors++;
    } else {
      console.log(`  ✅ Added (${kmaCode})`);
      added++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Added: ${added}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${US_CITIES.length}`);
}

importCities().catch(console.error);
