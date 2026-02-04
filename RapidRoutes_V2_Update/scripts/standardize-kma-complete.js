import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

// Full DAT KMA mapping - covering all major US freight markets
const stateToKMAMap = {
  'AL': { 'Birmingham': 'BHM', 'Montgomery': 'MGM', 'Mobile': 'MOB', 'Huntsville': 'HSV', default: 'BHM' },
  'AR': { 'Little Rock': 'LIT', 'Fayetteville': 'FAY', 'Fort Smith': 'FSM', default: 'LIT' },
  'AZ': { 'Phoenix': 'PHX', 'Tucson': 'TUS', 'Flagstaff': 'FLG', default: 'PHX' },
  'CA': { 'Los Angeles': 'LAX', 'San Francisco': 'SFO', 'San Diego': 'SAN', 'Sacramento': 'SMF', default: 'LAX' },
  'CO': { 'Denver': 'DEN', 'Colorado Springs': 'COS', 'Grand Junction': 'GJT', default: 'DEN' },
  'CT': { 'Hartford': 'HFD', 'New Haven': 'HVN', default: 'HFD' },
  'DE': { 'Wilmington': 'ILG', default: 'ILG' },
  'FL': { 'Miami': 'MIA', 'Orlando': 'MCO', 'Tampa': 'TPA', 'Jacksonville': 'JAX', default: 'MIA' },
  'GA': { 'Atlanta': 'ATL', 'Savannah': 'SAV', 'Augusta': 'AGS', 'Macon': 'MCN', default: 'ATL' },
  'IA': { 'Des Moines': 'DSM', 'Cedar Rapids': 'CID', default: 'DSM' },
  'ID': { 'Boise': 'BOI', 'Idaho Falls': 'IDA', default: 'BOI' },
  'IL': { 'Chicago': 'CHI', 'Springfield': 'SPI', 'Rockford': 'RFD', default: 'CHI' },
  'IN': { 'Indianapolis': 'IND', 'Fort Wayne': 'FWA', 'South Bend': 'SBN', default: 'IND' },
  'KS': { 'Kansas City': 'MCI', 'Wichita': 'ICT', default: 'MCI' },
  'KY': { 'Louisville': 'SDF', 'Lexington': 'LEX', default: 'SDF' },
  'LA': { 'New Orleans': 'MSY', 'Baton Rouge': 'BTR', 'Shreveport': 'SHV', default: 'MSY' },
  'MA': { 'Boston': 'BOS', 'Springfield': 'CEF', default: 'BOS' },
  'MD': { 'Baltimore': 'BWI', default: 'BWI' },
  'ME': { 'Portland': 'PWM', 'Bangor': 'BGR', default: 'PWM' },
  'MI': { 'Detroit': 'DTW', 'Grand Rapids': 'GRR', 'Lansing': 'LAN', default: 'DTW' },
  'MN': { 'Minneapolis': 'MSP', 'Duluth': 'DLH', default: 'MSP' },
  'MO': { 'St. Louis': 'STL', 'Kansas City': 'MCI', 'Springfield': 'SGF', default: 'STL' },
  'MS': { 'Jackson': 'JAN', 'Gulfport': 'GPT', default: 'JAN' },
  'MT': { 'Billings': 'BIL', 'Missoula': 'MSO', default: 'BIL' },
  'NC': { 'Charlotte': 'CLT', 'Raleigh': 'RDU', 'Greensboro': 'GSO', default: 'CLT' },
  'ND': { 'Fargo': 'FAR', 'Bismarck': 'BIS', default: 'FAR' },
  'NE': { 'Omaha': 'OMA', 'Lincoln': 'LNK', default: 'OMA' },
  'NH': { 'Manchester': 'MHT', default: 'MHT' },
  'NJ': { 'Newark': 'EWR', 'Atlantic City': 'ACY', default: 'EWR' },
  'NM': { 'Albuquerque': 'ABQ', default: 'ABQ' },
  'NV': { 'Las Vegas': 'LAS', 'Reno': 'RNO', default: 'LAS' },
  'NY': { 'New York': 'NYC', 'Buffalo': 'BUF', 'Albany': 'ALB', default: 'NYC' },
  'OH': { 'Cleveland': 'CLE', 'Columbus': 'CMH', 'Cincinnati': 'CVG', default: 'CLE' },
  'OK': { 'Oklahoma City': 'OKC', 'Tulsa': 'TUL', default: 'OKC' },
  'OR': { 'Portland': 'PDX', 'Eugene': 'EUG', 'Medford': 'MFR', default: 'PDX' },
  'PA': { 'Philadelphia': 'PHL', 'Pittsburgh': 'PIT', 'Harrisburg': 'MDT', default: 'PHL' },
  'RI': { 'Providence': 'PVD', default: 'PVD' },
  'SC': { 'Columbia': 'CAE', 'Charleston': 'CHS', 'Greenville': 'GSP', default: 'CAE' },
  'SD': { 'Sioux Falls': 'FSD', 'Rapid City': 'RAP', default: 'FSD' },
  'TN': { 'Memphis': 'MEM', 'Nashville': 'BNA', 'Knoxville': 'TYS', default: 'BNA' },
  'TX': { 'Dallas': 'DFW', 'Houston': 'HOU', 'San Antonio': 'SAT', 'Austin': 'AUS', default: 'DFW' },
  'UT': { 'Salt Lake City': 'SLC', default: 'SLC' },
  'VA': { 'Richmond': 'RIC', 'Norfolk': 'ORF', 'Roanoke': 'ROA', default: 'RIC' },
  'VT': { 'Burlington': 'BTV', default: 'BTV' },
  'WA': { 'Seattle': 'SEA', 'Spokane': 'GEG', default: 'SEA' },
  'WI': { 'Milwaukee': 'MKE', 'Madison': 'MSN', 'Green Bay': 'GRB', default: 'MKE' },
  'WV': { 'Charleston': 'CRW', 'Huntington': 'HTS', default: 'CRW' },
  'WY': { 'Cheyenne': 'CYS', 'Casper': 'CPR', default: 'CYS' }
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

async function updateAllKMACodes() {
  console.log('Starting complete KMA code standardization...');
  
  try {
    // Get ALL cities in batches
    let startId = 0;
    const batchSize = 1000;
    let totalUpdates = 0;
    let totalSkipped = 0;
    let totalCities = 0;
    
    while (true) {
      const { data: cities, error: fetchError } = await supabase
        .from('cities')
        .select('*')
        .gt('id', startId)
        .order('id', { ascending: true })
        .limit(batchSize);
      
      if (fetchError) throw fetchError;
      if (!cities?.length) break;
      
      console.log(`\nProcessing batch of ${cities.length} cities starting at ID ${startId}...`);
      
      let batchUpdates = 0;
      let batchSkipped = 0;
      
      for (const city of cities) {
        // Get proper DAT KMA code
        const newKMA = getDAT_KMA(city.state_or_province, city.city);
        
        if (newKMA && city.kma_code !== newKMA) {
          const { error: updateError } = await supabase
            .from('cities')
            .update({ kma_code: newKMA })
            .eq('id', city.id);
            
          if (updateError) {
            console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);
            continue;
          }
          
          batchUpdates++;
          totalUpdates++;
          console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code || 'NULL'} → ${newKMA}`);
        } else {
          batchSkipped++;
          totalSkipped++;
        }
      }
      
      totalCities += cities.length;
      console.log(`Batch complete: ${batchUpdates} updated, ${batchSkipped} skipped`);
      
      startId = cities[cities.length - 1].id;
    }
    
    console.log('\nFinal Results:');
    console.log('---------------');
    console.log(`Total cities processed: ${totalCities}`);
    console.log(`Total updates: ${totalUpdates}`);
    console.log(`Total skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('Update failed:', error);
  }
}

updateAllKMACodes();