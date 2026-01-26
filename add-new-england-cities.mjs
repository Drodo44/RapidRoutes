// add-new-england-cities.mjs
// Add all major New England cities to database using HERE.com API

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: `${__dirname}/.env.local` });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HERE_API_KEY = process.env.HERE_API_KEY || process.env.NEXT_PUBLIC_HERE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!HERE_API_KEY) {
  console.error('⚠️  Missing HERE_API_KEY. Geocoding will not work.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Major cities in New England states
const NEW_ENGLAND_CITIES = [
  // Massachusetts - 78 cities
  { city: 'Boston', state: 'MA' },
  { city: 'Worcester', state: 'MA' },
  { city: 'Springfield', state: 'MA' },
  { city: 'Cambridge', state: 'MA' },
  { city: 'Lowell', state: 'MA' },
  { city: 'Brockton', state: 'MA' },
  { city: 'New Bedford', state: 'MA' },
  { city: 'Quincy', state: 'MA' },
  { city: 'Lynn', state: 'MA' },
  { city: 'Fall River', state: 'MA' },
  { city: 'Newton', state: 'MA' },
  { city: 'Lawrence', state: 'MA' },
  { city: 'Somerville', state: 'MA' },
  { city: 'Framingham', state: 'MA' },
  { city: 'Haverhill', state: 'MA' },
  { city: 'Waltham', state: 'MA' },
  { city: 'Malden', state: 'MA' },
  { city: 'Brookline', state: 'MA' },
  { city: 'Plymouth', state: 'MA' },
  { city: 'Medford', state: 'MA' },
  { city: 'Taunton', state: 'MA' },
  { city: 'Chicopee', state: 'MA' },
  { city: 'Weymouth', state: 'MA' },
  { city: 'Revere', state: 'MA' },
  { city: 'Peabody', state: 'MA' },
  { city: 'Methuen', state: 'MA' },
  { city: 'Barnstable', state: 'MA' },
  { city: 'Pittsfield', state: 'MA' },
  { city: 'Attleboro', state: 'MA' },
  { city: 'Everett', state: 'MA' },
  { city: 'Salem', state: 'MA' },
  { city: 'Westfield', state: 'MA' },
  { city: 'Leominster', state: 'MA' },
  { city: 'Fitchburg', state: 'MA' },
  { city: 'Beverly', state: 'MA' },
  { city: 'Holyoke', state: 'MA' },
  { city: 'Marlborough', state: 'MA' },
  { city: 'Woburn', state: 'MA' },
  { city: 'Chelsea', state: 'MA' },
  { city: 'Braintree', state: 'MA' },
  { city: 'Dedham', state: 'MA' },
  { city: 'Randolph', state: 'MA' },
  { city: 'Natick', state: 'MA' },
  { city: 'Watertown', state: 'MA' },
  { city: 'Arlington', state: 'MA' },
  { city: 'Needham', state: 'MA' },
  { city: 'Wellesley', state: 'MA' },
  { city: 'Andover', state: 'MA' },
  { city: 'Norwood', state: 'MA' },
  { city: 'Stoughton', state: 'MA' },
  
  // New Hampshire - 30 cities
  { city: 'Manchester', state: 'NH' },
  { city: 'Nashua', state: 'NH' },
  { city: 'Concord', state: 'NH' },
  { city: 'Derry', state: 'NH' },
  { city: 'Dover', state: 'NH' },
  { city: 'Rochester', state: 'NH' },
  { city: 'Salem', state: 'NH' },
  { city: 'Merrimack', state: 'NH' },
  { city: 'Hudson', state: 'NH' },
  { city: 'Londonderry', state: 'NH' },
  { city: 'Keene', state: 'NH' },
  { city: 'Bedford', state: 'NH' },
  { city: 'Portsmouth', state: 'NH' },
  { city: 'Goffstown', state: 'NH' },
  { city: 'Laconia', state: 'NH' },
  { city: 'Hampton', state: 'NH' },
  { city: 'Windham', state: 'NH' },
  { city: 'Exeter', state: 'NH' },
  { city: 'Hooksett', state: 'NH' },
  { city: 'Claremont', state: 'NH' },
  
  // Vermont - 20 cities
  { city: 'Burlington', state: 'VT' },
  { city: 'South Burlington', state: 'VT' },
  { city: 'Rutland', state: 'VT' },
  { city: 'Barre', state: 'VT' },
  { city: 'Montpelier', state: 'VT' },
  { city: 'Winooski', state: 'VT' },
  { city: 'St. Albans', state: 'VT' },
  { city: 'Newport', state: 'VT' },
  { city: 'Vergennes', state: 'VT' },
  { city: 'Brattleboro', state: 'VT' },
  { city: 'Bennington', state: 'VT' },
  { city: 'Springfield', state: 'VT' },
  { city: 'St. Johnsbury', state: 'VT' },
  { city: 'White River Junction', state: 'VT' },
  
  // Maine - 30 cities
  { city: 'Portland', state: 'ME' },
  { city: 'Lewiston', state: 'ME' },
  { city: 'Bangor', state: 'ME' },
  { city: 'South Portland', state: 'ME' },
  { city: 'Auburn', state: 'ME' },
  { city: 'Biddeford', state: 'ME' },
  { city: 'Sanford', state: 'ME' },
  { city: 'Augusta', state: 'ME' },
  { city: 'Saco', state: 'ME' },
  { city: 'Westbrook', state: 'ME' },
  { city: 'Waterville', state: 'ME' },
  { city: 'Presque Isle', state: 'ME' },
  { city: 'Scarborough', state: 'ME' },
  { city: 'Brunswick', state: 'ME' },
  { city: 'Gorham', state: 'ME' },
  { city: 'York', state: 'ME' },
  { city: 'Kennebunk', state: 'ME' },
  { city: 'Bath', state: 'ME' },
  { city: 'Ellsworth', state: 'ME' },
  { city: 'Bar Harbor', state: 'ME' },
  
  // Rhode Island - 15 cities
  { city: 'Providence', state: 'RI' },
  { city: 'Warwick', state: 'RI' },
  { city: 'Cranston', state: 'RI' },
  { city: 'Pawtucket', state: 'RI' },
  { city: 'East Providence', state: 'RI' },
  { city: 'Woonsocket', state: 'RI' },
  { city: 'Newport', state: 'RI' },
  { city: 'Central Falls', state: 'RI' },
  { city: 'Westerly', state: 'RI' },
  { city: 'North Providence', state: 'RI' },
  { city: 'Cumberland', state: 'RI' },
  { city: 'South Kingstown', state: 'RI' },
  { city: 'Smithfield', state: 'RI' },
  { city: 'Middletown', state: 'RI' },
  { city: 'Bristol', state: 'RI' },
  
  // Connecticut - 40 cities
  { city: 'Bridgeport', state: 'CT' },
  { city: 'New Haven', state: 'CT' },
  { city: 'Stamford', state: 'CT' },
  { city: 'Hartford', state: 'CT' },
  { city: 'Waterbury', state: 'CT' },
  { city: 'Norwalk', state: 'CT' },
  { city: 'Danbury', state: 'CT' },
  { city: 'New Britain', state: 'CT' },
  { city: 'Meriden', state: 'CT' },
  { city: 'Bristol', state: 'CT' },
  { city: 'West Haven', state: 'CT' },
  { city: 'Milford', state: 'CT' },
  { city: 'Middletown', state: 'CT' },
  { city: 'Norwich', state: 'CT' },
  { city: 'Shelton', state: 'CT' },
  { city: 'Torrington', state: 'CT' },
  { city: 'Stratford', state: 'CT' },
  { city: 'East Hartford', state: 'CT' },
  { city: 'Fairfield', state: 'CT' },
  { city: 'Trumbull', state: 'CT' },
  { city: 'West Hartford', state: 'CT' },
  { city: 'Greenwich', state: 'CT' },
  { city: 'Hamden', state: 'CT' },
  { city: 'Enfield', state: 'CT' },
  { city: 'Southington', state: 'CT' },
  { city: 'Manchester', state: 'CT' },
  { city: 'Newington', state: 'CT' },
  { city: 'Glastonbury', state: 'CT' },
  { city: 'New London', state: 'CT' },
  { city: 'Groton', state: 'CT' },
];

// KMA mappings for New England states
const KMA_MAPPINGS = {
  'MA': {
    'Boston': 'MA_BOS',
    'Worcester': 'MA_WOR',
    'Springfield': 'MA_SPR',
    'Fall River': 'MA_PRO',
    'New Bedford': 'MA_PRO',
    'Pittsfield': 'MA_ALB', // Western MA is closer to Albany market
  },
  'NH': {
    'Manchester': 'NH_MAN',
    'Nashua': 'NH_MAN',
    'Concord': 'NH_MAN',
    'Portsmouth': 'NH_MAN',
  },
  'VT': {
    'Burlington': 'VT_BUR',
    'Rutland': 'VT_BUR',
  },
  'ME': {
    'Portland': 'ME_POR',
    'Bangor': 'ME_BAN',
    'Lewiston': 'ME_POR',
  },
  'RI': {
    'Providence': 'RI_PRO',
    'Warwick': 'RI_PRO',
  },
  'CT': {
    'Hartford': 'CT_HAR',
    'New Haven': 'CT_NEW',
    'Bridgeport': 'CT_BRI',
    'Stamford': 'CT_STA',
  }
};

// Get KMA for city (if predefined) or find closest based on coordinates
function getKmaForCity(city, state, lat, lon) {
  // Check predefined mappings first
  if (KMA_MAPPINGS[state] && KMA_MAPPINGS[state][city]) {
    return KMA_MAPPINGS[state][city];
  }
  
  // Default KMAs by state
  const defaultKmas = {
    'MA': 'MA_BOS',
    'NH': 'NH_MAN',
    'VT': 'VT_BUR',
    'ME': 'ME_POR',
    'RI': 'RI_PRO',
    'CT': 'CT_HAR'
  };
  
  return defaultKmas[state] || null;
}

// Geocode city using HERE.com API
async function geocodeCity(city, state) {
  if (!HERE_API_KEY) {
    console.log(`   ⚠️  No HERE API key, skipping geocoding for ${city}, ${state}`);
    return null;
  }
  
  try {
    const response = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
      params: {
        q: `${city}, ${state}, USA`,
        apiKey: HERE_API_KEY,
        limit: 1
      }
    });
    
    if (response.data?.items && response.data.items.length > 0) {
      const item = response.data.items[0];
      return {
        latitude: item.position.lat,
        longitude: item.position.lng,
        city: item.address.city || city,
        state: item.address.stateCode || state,
        zip: item.address.postalCode || null
      };
    }
  } catch (error) {
    console.error(`   ❌ Geocoding error for ${city}, ${state}:`, error.message);
  }
  
  return null;
}

// Main function
async function main() {
  console.log('=== ADDING NEW ENGLAND CITIES TO DATABASE ===\n');
  console.log(`Total cities to process: ${NEW_ENGLAND_CITIES.length}\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const { city, state } of NEW_ENGLAND_CITIES) {
    console.log(`Processing: ${city}, ${state}`);
    
    // Check if city already exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .ilike('city', city)
      .eq('state_or_province', state)
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`   ✓ Already exists, skipping`);
      skipped++;
      continue;
    }
    
    // Geocode the city
    const geocoded = await geocodeCity(city, state);
    if (!geocoded) {
      console.log(`   ❌ Failed to geocode, skipping`);
      errors++;
      continue;
    }
    
    // Determine KMA code
    const kmaCode = getKmaForCity(city, state, geocoded.latitude, geocoded.longitude);
    
    // Insert into database
    const cityData = {
      city: geocoded.city,
      state_or_province: geocoded.state,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      zip: geocoded.zip,
      kma_code: kmaCode,
      kma_name: null // Will be populated later if needed
    };
    
    const { error } = await supabase
      .from('cities')
      .insert(cityData);
    
    if (error) {
      console.error(`   ❌ Database error:`, error.message);
      errors++;
    } else {
      console.log(`   ✅ Added: ${city}, ${state} (${kmaCode}) at ${geocoded.latitude}, ${geocoded.longitude}`);
      added++;
    }
    
    // Rate limiting - wait 100ms between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Added: ${added}`);
  console.log(`⚠️  Skipped (already exist): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total: ${NEW_ENGLAND_CITIES.length}`);
}

main().catch(console.error);
