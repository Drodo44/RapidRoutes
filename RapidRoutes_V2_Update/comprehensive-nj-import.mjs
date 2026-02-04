// comprehensive-nj-import.mjs
// Add comprehensive NJ coverage - all cities 10k+ population

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HERE_API_KEY = process.env.HERE_API_KEY || process.env.NEXT_PUBLIC_HERE_API_KEY;

// Comprehensive NJ cities list (10k+ population)
const NJ_CITIES = [
  // Already added major cities, but including for completeness
  'Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Woodbridge',
  'Lakewood', 'Toms River', 'Hamilton', 'Trenton', 'Clifton', 'Camden',
  'Brick', 'Cherry Hill', 'Passaic', 'Union City', 'Bayonne', 'East Orange',
  'Vineland', 'New Brunswick', 'Hoboken', 'Perth Amboy', 'West New York',
  'Plainfield', 'Hackensack', 'Sayreville', 'Kearny', 'Linden', 'Atlantic City',
  
  // Additional cities 10k+
  'Union', 'Parsippany-Troy Hills', 'Franklin', 'Gloucester', 'Old Bridge',
  'Bloomfield', 'Washington', 'Egg Harbor', 'Deptford', 'Middletown', 'Ewing',
  'Mount Laurel', 'Bridgeton', 'North Bergen', 'Piscataway', 'Millville',
  'West Orange', 'Fort Lee', 'Irvington', 'Long Branch', 'Manalapan',
  'Pennsauken', 'Willingboro', 'Montclair', 'Monroe', 'Teaneck', 'Jackson',
  'Lawrence', 'Voorhees', 'Rahway', 'Evesham', 'Garfield', 'Somerset',
  'Marlboro', 'Mahwah', 'Ridgewood', 'Fair Lawn', 'Paramus', 'Lodi',
  'Cliffside Park', 'Bergenfield', 'Nutley', 'Wayne', 'Princeton',
  'Livingston', 'Westfield', 'Elmwood Park', 'Roselle', 'Hillside',
  'Madison', 'South Plainfield', 'Morristown', 'Englewood', 'Millburn',
  'Belleville', 'Carteret', 'South Orange', 'Secaucus', 'Lyndhurst',
  'Rutherford', 'North Plainfield', 'Ridgefield Park', 'Dumont', 'Fairview',
  'Glassboro', 'Hammonton', 'Ocean', 'Pemberton', 'Howell', 'Mount Olive',
  'Galloway', 'Randolph', 'Roxbury', 'Bernards', 'Moorestown', 'Freehold',
  'Scotch Plains', 'Cranford', 'Summit', 'Pleasantville', 'Burlington',
  'Collingswood', 'Harrison', 'Westwood', 'Sparta', 'Ramsey', 'Hillsborough',
  'Verona', 'Hawthorne', 'Medford', 'Pennsville', 'Somerville', 'Asbury Park'
];

// KMA assignment logic
function getKmaForNJCity(city, lat, lon) {
  // North Jersey - Newark metro area
  const northJerseyCities = ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 
    'Clifton', 'Passaic', 'Union City', 'Bayonne', 'East Orange', 'Hoboken', 'West New York',
    'Hackensack', 'Kearny', 'Linden', 'Bloomfield', 'North Bergen', 'Fort Lee', 'Irvington',
    'West Orange', 'Teaneck', 'Garfield', 'Fair Lawn', 'Paramus', 'Lodi', 'Cliffside Park',
    'Bergenfield', 'Nutley', 'Wayne', 'Livingston', 'Belleville', 'Secaucus', 'Lyndhurst',
    'Rutherford', 'Ridgefield Park', 'Dumont', 'Fairview', 'Westwood', 'Ramsey', 'Verona',
    'Hawthorne', 'Union'];
  
  // Central Jersey - Trenton/New Brunswick area
  const centralJerseyCities = ['Trenton', 'New Brunswick', 'Woodbridge', 'Old Bridge', 
    'Perth Amboy', 'Sayreville', 'Piscataway', 'Ewing', 'Hamilton', 'Lawrence', 'Somerset',
    'Marlboro', 'Princeton', 'South Plainfield', 'Carteret', 'Manalapan', 'Monroe',
    'Rahway', 'Plainfield', 'North Plainfield', 'Scotch Plains', 'Cranford', 'Westfield',
    'Hillsborough', 'Somerville', 'Freehold', 'Howell'];
  
  // South Jersey - Philadelphia suburbs
  const southJerseyCities = ['Camden', 'Cherry Hill', 'Gloucester', 'Deptford', 
    'Mount Laurel', 'Voorhees', 'Willingboro', 'Pennsauken', 'Evesham', 'Moorestown',
    'Collingswood', 'Burlington', 'Medford', 'Pemberton'];
  
  // Jersey Shore / Atlantic area
  const shoreCities = ['Toms River', 'Lakewood', 'Brick', 'Atlantic City', 'Vineland',
    'Bridgeton', 'Millville', 'Long Branch', 'Egg Harbor', 'Middletown', 'Jackson',
    'Galloway', 'Ocean', 'Pleasantville', 'Hammonton', 'Asbury Park', 'Ocean City'];
  
  // Oakland area (northern)
  const oaklandArea = ['Oakland', 'Mahwah', 'Ridgewood', 'Sparta'];
  
  // Morristown area (northwestern)
  const morristownArea = ['Morristown', 'Madison', 'Mount Olive', 'Randolph', 'Roxbury', 'Bernards'];
  
  // Glassboro area (southern)
  const glassboroArea = ['Glassboro', 'Pennsville'];
  
  if (northJerseyCities.includes(city)) return 'NJ_NEW';
  if (centralJerseyCities.includes(city)) return 'NJ_TRE';
  if (southJerseyCities.includes(city)) return 'PA_PHI';
  if (shoreCities.includes(city)) return 'NJ_ATL';
  if (oaklandArea.includes(city)) return 'NJ_ELI';
  if (morristownArea.includes(city)) return 'NJ_MOR';
  if (glassboroArea.includes(city)) return 'NJ_ATL';
  
  // Default based on latitude
  if (lat > 40.8) return 'NJ_NEW';  // North
  if (lat > 40.2) return 'NJ_TRE';  // Central
  return 'NJ_ATL';  // South/Shore
}

async function geocodeCity(city) {
  if (!HERE_API_KEY) {
    console.log(`  ⚠️  No HERE API key, skipping ${city}`);
    return null;
  }
  
  try {
    const response = await axios.get('https://geocode.search.hereapi.com/v1/geocode', {
      params: {
        q: `${city}, NJ, USA`,
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
  console.log('=== COMPREHENSIVE NJ IMPORT ===\n');
  console.log(`Total cities to process: ${NJ_CITIES.length}\n`);
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const city of NJ_CITIES) {
    console.log(`Processing: ${city}, NJ`);
    
    // Check if exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .ilike('city', city)
      .eq('state_or_province', 'NJ')
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
    const kmaCode = getKmaForNJCity(city, geocoded.latitude, geocoded.longitude);
    
    // Insert
    const { error } = await supabase
      .from('cities')
      .insert({
        city: geocoded.city,
        state_or_province: 'NJ',
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
  console.log(`📊 Total NJ cities now: ${added + skipped}`);
}

importCities().catch(console.error);
