import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== FINAL COVERAGE CHECK AFTER ADDITIONS ===\n');

// Freight hub states that should have 20+ cities
const freightHubs = {
  'CA': 'California',
  'TX': 'Texas', 
  'FL': 'Florida',
  'NY': 'New York',
  'IL': 'Illinois',
  'PA': 'Pennsylvania',
  'OH': 'Ohio',
  'GA': 'Georgia',
  'NC': 'North Carolina',
  'MI': 'Michigan',
  'NJ': 'New Jersey',
  'TN': 'Tennessee',
  'AZ': 'Arizona',
  'WA': 'Washington',
  'CO': 'Colorado'
};

console.log('🚛 FREIGHT HUB STATES:\n');

const needsWork = [];

for (const [code, name] of Object.entries(freightHubs)) {
  const { count } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', code);
  
  const status = count >= 50 ? '✅' : count >= 20 ? '🟢' : count >= 10 ? '🟡' : '🟠';
  console.log(`${status} ${code} (${name}): ${count} cities`);
  
  if (count < 20) {
    needsWork.push({ code, name, count });
  }
}

if (needsWork.length > 0) {
  console.log('\n\n🔧 STATES NEEDING MORE CITIES (< 20):');
  needsWork.forEach(s => {
    console.log(`   ${s.code} (${s.name}): ${s.count} cities - add ${20 - s.count} more`);
  });
} else {
  console.log('\n\n✅ ALL FREIGHT HUB STATES HAVE ADEQUATE COVERAGE!');
}

// Check other low-coverage states
const allStates = ['AL', 'AR', 'AZ', 'CO', 'DE', 'ID', 'IN', 'KS', 'LA', 'MS', 'MT', 'ND', 'NE', 'NM', 'NV', 'OK', 'OR', 'SC', 'SD', 'UT', 'WV', 'WY'];
const lowCoverage = [];

for (const state of allStates) {
  const { count } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true })
    .eq('state_or_province', state);
  
  if (count < 10) {
    lowCoverage.push({ state, count });
  }
}

if (lowCoverage.length > 0) {
  console.log('\n\n🟠 OTHER STATES WITH < 10 CITIES:');
  lowCoverage.sort((a, b) => a.count - b.count).forEach(s => {
    console.log(`   ${s.state}: ${s.count} cities`);
  });
}
