// expand-ma-coverage.mjs
// Add missing MA freight corridor cities

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY || process.env.NEXT_PUBLIC_HERE_API_KEY;

// Missing important MA freight cities
const MA_CITIES = [
  // I-495 corridor (major logistics hub)
  'Foxborough', 'Mansfield', 'Franklin', 'Milford', 'Bellingham',
  'Hopkinton', 'Westborough', 'Shrewsbury', 'Grafton', 'Northborough',
  'Southborough', 'Marlborough', 'Chelmsford', 'Billerica', 'Tewksbury',
  'Andover', 'North Andover', 'Wilmington', 'Burlington', 'Lexington',
  
  // I-93 corridor
  'Methuen', 'Wakefield', 'Reading', 'Stoneham', 'Woburn',
  
  // I-90 corridor (Mass Pike)
  'Auburn', 'Millbury', 'Westborough', 'Southborough', 'Framingham',
  'Natick', 'Wellesley', 'Newton', 'Weston',
  
  // South Shore
  'Brockton', 'Bridgewater', 'Easton', 'Raynham', 'Middleborough',
  'Wareham', 'Plymouth', 'Kingston', 'Hanover', 'Rockland',
  'Abington', 'Whitman', 'East Bridgewater',
  
  // North Shore
  'Danvers', 'Peabody', 'Salem', 'Beverly', 'Gloucester',
  'Newburyport', 'Amesbury', 'Salisbury',
  
  // Central MA
  'Worcester', 'Leominster', 'Fitchburg', 'Gardner', 'Athol',
  'Webster', 'Southbridge',
  
  // Western MA
  'Springfield', 'Chicopee', 'Holyoke', 'Westfield', 'Agawam',
  'West Springfield', 'Ludlow', 'Palmer',
  
  // Cape Cod (seasonal but important)
  'Barnstable', 'Hyannis', 'Yarmouth', 'Dennis', 'Brewster',
  'Orleans', 'Chatham', 'Harwich', 'Mashpee', 'Falmouth',
  'Sandwich', 'Bourne'
];

// KMA assignment
function getKmaForMACity(city, lat, lon) {
  // Boston metro (MA_BOS)
  const bostonMetro = ['Boston', 'Cambridge', 'Somerville', 'Brookline', 'Newton',
    'Waltham', 'Watertown', 'Arlington', 'Medford', 'Malden', 'Everett', 'Chelsea',
    'Revere', 'Quincy', 'Braintree', 'Weymouth', 'Dedham', 'Needham', 'Wellesley',
    'Natick', 'Framingham', 'Lexington', 'Burlington', 'Woburn', 'Reading', 'Stoneham',
    'Wakefield', 'Melrose', 'Peabody', 'Salem', 'Beverly', 'Danvers', 'Lynn',
    'Saugus', 'Winthrop', 'Milton', 'Randolph', 'Norwood', 'Canton'];
  
  // Worcester area (MA_WOR)
  const worcesterArea = ['Worcester', 'Shrewsbury', 'Grafton', 'Millbury', 'Auburn',
    'Leicester', 'Paxton', 'Holden', 'West Boylston', 'Boylston', 'Northborough',
    'Southborough', 'Westborough', 'Marlborough', 'Webster', 'Southbridge'];
  
  // Springfield area (MA_SPR)
  const springfieldArea = ['Springfield', 'Chicopee', 'Holyoke', 'Westfield', 'Agawam',
    'West Springfield', 'Ludlow', 'Palmer', 'Longmeadow', 'East Longmeadow',
    'Wilbraham', 'Monson'];
  
  // Lowell/Lawrence area
  const lowellArea = ['Lowell', 'Lawrence', 'Haverhill', 'Methuen', 'North Andover',
    'Andover', 'Chelmsford', 'Billerica', 'Tewksbury', 'Dracut', 'Westford',
    'Littleton', 'Ayer', 'Groton'];
  
  // Fall River/New Bedford area
  const fallRiverArea = ['Fall River', 'New Bedford', 'Taunton', 'Attleboro',
    'Somerset', 'Swansea', 'Westport', 'Dartmouth', 'Fairhaven', 'Acushnet',
    'Seekonk', 'Rehoboth'];
  
  // Brockton/South Shore
  const brocktonArea = ['Brockton', 'Easton', 'Bridgewater', 'East Bridgewater',
    'West Bridgewater', 'Whitman', 'Abington', 'Rockland', 'Hanover', 'Pembroke',
    'Duxbury', 'Kingston', 'Plymouth', 'Middleborough', 'Raynham', 'Stoughton',
    'Avon', 'Holbrook'];
  
  // North Shore
  const northShore = ['Gloucester', 'Newburyport', 'Amesbury', 'Salisbury',
    'Rowley', 'Ipswich', 'Essex', 'Rockport', 'Manchester'];
  
  // Cape Cod
  const capeCod = ['Barnstable', 'Hyannis', 'Yarmouth', 'Dennis', 'Brewster',
    'Orleans', 'Chatham', 'Harwich', 'Mashpee', 'Falmouth', 'Sandwich', 'Bourne',
    'Eastham', 'Wellfleet', 'Truro', 'Provincetown'];
  
  // Central MA
  const centralMA = ['Fitchburg', 'Leominster', 'Gardner', 'Athol', 'Orange',
    'Clinton', 'Lancaster', 'Sterling'];
  
  // I-495 corridor (defaults to Boston metro)
  const i495Corridor = ['Foxborough', 'Mansfield', 'Franklin', 'Milford',
    'Bellingham', 'Hopkinton', 'Wrentham', 'Norfolk'];
  
  if (bostonMetro.includes(city) || i495Corridor.includes(city)) return 'MA_BOS';
  if (worcesterArea.includes(city)) return 'MA_WOR';
  if (springfieldArea.includes(city)) return 'MA_SPR';
  if (lowellArea.includes(city)) return 'MA_BOS'; // Lowell is part of Greater Boston
  if (fallRiverArea.includes(city)) return 'MA_BOS'; // Close enough to Boston metro
  if (brocktonArea.includes(city)) return 'MA_BOS';
  if (northShore.includes(city)) return 'MA_BOS';
  if (capeCod.includes(city)) return 'MA_BOS';
  if (centralMA.includes(city)) return 'MA_WOR';
  
  // Default based on proximity
  if (lon < -72.0) return 'MA_SPR';  // Western MA
  if (lon < -71.5) return 'MA_WOR';  // Central MA
  return 'MA_BOS';  // Eastern MA
}

async function geocodeCity(city) {
  if (!HERE_API_KEY) {
    console.log(`  ⚠️  No HERE API key, skipping ${city}`);
    return null;
  }
  
  try {
    const response = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
      params: {
        q: `${city}, MA, USA`,
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
        zip: item.address.postalCode || null
      };
    }
  } catch (error) {
    console.error(`  ❌ Geocoding error for ${city}:`, error.message);
  }
  
  return null;
}

async function importCities() {
  console.log('=== MA COVERAGE EXPANSION ===\n');
  console.log(`Cities to process: ${MA_CITIES.length}\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const city of MA_CITIES) {
    console.log(`Processing: ${city}, MA`);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .ilike('city', city)
      .eq('state_or_province', 'MA')
      .limit(1);
    
    if (existing && existing.length > 0) {
      console.log(`  ✓ Already exists`);
      skipped++;
      continue;
    }
    
    // Geocode
    const geocoded = await geocodeCity(city);
    if (!geocoded) {
      console.log(`  ❌ Failed to geocode`);
      errors++;
      continue;
    }
    
    // Get KMA
    const kmaCode = getKmaForMACity(city, geocoded.latitude, geocoded.longitude);
    
    // Insert
    const { error } = await supabase
      .from('cities')
      .insert({
        city: geocoded.city,
        state_or_province: 'MA',
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        kma_code: kmaCode,
        zip: geocoded.zip
      });
    
    if (error) {
      console.error(`  ❌ Database error:`, error.message);
      errors++;
    } else {
      console.log(`  ✅ Added (${kmaCode})`);
      added++;
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log('\n=== SUMMARY ===');
  console.log(`✅ Added: ${added}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`📊 Total MA cities now: ${added + skipped}`);
}

importCities().catch(console.error);
