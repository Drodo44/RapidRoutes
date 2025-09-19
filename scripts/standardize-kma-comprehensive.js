import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

// DAT KMA mapping - much more comprehensive
const stateToKMAMap = {
  'AL': { 
    'Birmingham': 'BHM',
    'Montgomery': 'MGM',
    'Mobile': 'MOB',
    'Huntsville': 'HSV',
    'Decatur': 'HSV',
    'Florence': 'MSL',
    'default': 'BHM'
  },
  'AR': {
    'Fayetteville': 'FAY',
    'Little Rock': 'LIT',
    'Fort Smith': 'FSM',
    'Jonesboro': 'JBR',
    'default': 'LIT'
  },
  'GA': {
    'Atlanta': 'ATL',
    'Savannah': 'SAV',
    'Augusta': 'AGS',
    'Macon': 'MCN',
    'Columbus': 'CSG',
    'Valdosta': 'VLD',
    'Albany': 'ABY',
    'default': 'ATL'
  },
  'FL': {
    'Miami': 'MIA',
    'Orlando': 'MCO',
    'Tampa': 'TPA',
    'Jacksonville': 'JAX',
    'Pensacola': 'PNS',
    'Tallahassee': 'TLH',
    'Fort Myers': 'RSW',
    'default': 'MIA'
  },
  'SC': {
    'Columbia': 'CAE',
    'Charleston': 'CHS',
    'Greenville': 'GSP',
    'Florence': 'FLO',
    'Myrtle Beach': 'MYR',
    'default': 'CAE'
  },
  'NC': {
    'Charlotte': 'CLT',
    'Raleigh': 'RDU',
    'Greensboro': 'GSO',
    'Wilmington': 'ILM',
    'Asheville': 'AVL',
    'default': 'CLT'
  },
  'TN': {
    'Memphis': 'MEM',
    'Nashville': 'BNA',
    'Knoxville': 'TYS',
    'Chattanooga': 'CHA',
    'Tri-Cities': 'TRI',
    'default': 'BNA'
  },
  'MS': {
    'Jackson': 'JAN',
    'Gulfport': 'GPT',
    'Hattiesburg': 'HBG',
    'Meridian': 'MEI',
    'Tupelo': 'TUP',
    'default': 'JAN'
  }
};

// Helper function to get major market KMA for a city/state
function getDAT_KMA(state, city) {
  const stateKMAs = stateToKMAMap[state];
  if (!stateKMAs) return null;
  
  // Try direct city match first
  for (const [marketCity, kma] of Object.entries(stateKMAs)) {
    if (kma === 'default') continue;
    if (city.toLowerCase().includes(marketCity.toLowerCase())) {
      return kma;
    }
  }
  
  // Return default KMA for the state
  return stateKMAs.default;
}

async function updateKMACodes() {
  console.log('Starting comprehensive KMA code standardization...');
  
  try {
    // Get all cities with non-standard KMA codes
    const { data: cities, error: fetchError } = await supabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null);
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${cities.length} cities with KMA codes to review`);
    
    let updates = 0;
    let skipped = 0;
    
    for (const city of cities) {
      // Skip if already a standard 3-letter code
      if (/^[A-Z]{3}$/.test(city.kma_code)) {
        skipped++;
        continue;
      }
      
      // Get proper DAT KMA code
      const newKMA = getDAT_KMA(city.state_or_province, city.city);
      
      if (newKMA) {
        const { error: updateError } = await supabase
          .from('cities')
          .update({ kma_code: newKMA })
          .eq('id', city.id);
          
        if (updateError) {
          console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);
          continue;
        }
        
        updates++;
        console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code} → ${newKMA}`);
      }
    }
    
    console.log(`\nCompleted updates: ${updates} cities converted to standard KMA codes`);
    console.log(`Skipped ${skipped} cities already in standard format`);
    
  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateKMACodes();