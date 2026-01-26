import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== US CITY COVERAGE ANALYSIS ===\n');

// Get all cities grouped by state
const { data: allCities } = await supabase
  .from('cities')
  .select('state_or_province');

if (!allCities) {
  console.error('Failed to fetch cities');
  process.exit(1);
}

const stateCounts = {};
allCities.forEach(c => {
  const state = c.state_or_province;
  stateCounts[state] = (stateCounts[state] || 0) + 1;
});

// All 50 US states
const allStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Categorize states
const wellCovered = []; // 50+ cities
const adequate = [];     // 20-49 cities
const sparse = [];       // 10-19 cities
const minimal = [];      // 1-9 cities
const missing = [];      // 0 cities

allStates.forEach(state => {
  const count = stateCounts[state] || 0;
  
  if (count === 0) missing.push(state);
  else if (count < 10) minimal.push({ state, count });
  else if (count < 20) sparse.push({ state, count });
  else if (count < 50) adequate.push({ state, count });
  else wellCovered.push({ state, count });
});

console.log('📊 COVERAGE BREAKDOWN:\n');

console.log(`✅ Well Covered (50+ cities): ${wellCovered.length} states`);
wellCovered.sort((a, b) => b.count - a.count).forEach(s => {
  console.log(`   ${s.state}: ${s.count} cities`);
});

console.log(`\n🟢 Adequate (20-49 cities): ${adequate.length} states`);
adequate.sort((a, b) => b.count - a.count).forEach(s => {
  console.log(`   ${s.state}: ${s.count} cities`);
});

console.log(`\n🟡 Sparse (10-19 cities): ${sparse.length} states`);
sparse.sort((a, b) => b.count - a.count).forEach(s => {
  console.log(`   ${s.state}: ${s.count} cities`);
});

console.log(`\n🟠 Minimal (1-9 cities): ${minimal.length} states`);
minimal.sort((a, b) => b.count - a.count).forEach(s => {
  console.log(`   ${s.state}: ${s.count} cities`);
});

console.log(`\n❌ MISSING (0 cities): ${missing.length} states`);
if (missing.length > 0) {
  console.log(`   ${missing.join(', ')}`);
} else {
  console.log('   None - all states have at least 1 city!');
}

// Priority states for freight
const freightHubs = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 'NJ'];
console.log('\n\n🚛 FREIGHT HUB STATES CHECK:');
freightHubs.forEach(state => {
  const count = stateCounts[state] || 0;
  const status = count >= 50 ? '✅' : count >= 20 ? '🟡' : '❌';
  console.log(`${status} ${state}: ${count} cities`);
});

console.log('\n\n💡 RECOMMENDATION:');
if (missing.length > 0) {
  console.log(`   Add cities to ${missing.length} missing states: ${missing.join(', ')}`);
}
if (minimal.length > 5) {
  console.log(`   Bolster ${minimal.length} states with minimal coverage`);
}
console.log(`   Total states in database: ${allStates.filter(s => stateCounts[s]).length}/50`);
