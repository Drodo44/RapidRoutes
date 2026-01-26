import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

// DAT KMA mapping
const stateToKMAMap = {
  'AL': { 
    'Birmingham': 'BHM',
    'Decatur': 'HSV', // Part of Huntsville market
    'Mobile': 'MOB',
    'Montgomery': 'MGM'
  },
  'AR': {
    'Fayetteville': 'FAY',
    'Little Rock': 'LIT'
  },
  'SC': {
    'Columbia': 'CAE'
  },
  // Add more states with proper DAT KMA codes
  'GA': {
    'Atlanta': 'ATL',
    'Savannah': 'SAV'
  },
  'TN': {
    'Memphis': 'MEM',
    'Nashville': 'BNA',
    'Knoxville': 'TYS'
  },
  'MS': {
    'Jackson': 'JAN',
    'Gulfport': 'GPT'
  }
};

async function updateKMACodes() {
  console.log('Starting KMA code standardization...');
  
  try {
    // Get all cities with non-standard KMA codes
    const { data: cities, error: fetchError } = await supabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null);
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${cities.length} cities with KMA codes to review`);
    
    let updates = 0;
    for (const city of cities) {
      // Skip if already a standard 3-letter code
      if (/^[A-Z]{3}$/.test(city.kma_code)) {
        continue;
      }
      
      // Try to find a matching DAT KMA
      const stateKMAs = stateToKMAMap[city.state_or_province];
      if (stateKMAs) {
        let newKMA = null;
        
        // Direct city match
        if (stateKMAs[city.city]) {
          newKMA = stateKMAs[city.city];
        }
        // Try closest major market (you'd expand this with distance calculations)
        else {
          // For testing, assign to first KMA in state
          newKMA = Object.values(stateKMAs)[0];
        }
        
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
    }
    
    console.log(`\nCompleted updates: ${updates} cities converted to standard KMA codes`);
    
  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateKMACodes();