// analyze-freight-coverage.mjs
// Check coverage for all major freight states

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Major freight states by volume (top 20)
const FREIGHT_STATES = [
  { state: 'CA', name: 'California', expectedMin: 200 },
  { state: 'TX', name: 'Texas', expectedMin: 200 },
  { state: 'FL', name: 'Florida', expectedMin: 150 },
  { state: 'NY', name: 'New York', expectedMin: 100 },
  { state: 'IL', name: 'Illinois', expectedMin: 150 },
  { state: 'PA', name: 'Pennsylvania', expectedMin: 150 },
  { state: 'OH', name: 'Ohio', expectedMin: 120 },
  { state: 'GA', name: 'Georgia', expectedMin: 100 },
  { state: 'NC', name: 'North Carolina', expectedMin: 100 },
  { state: 'MI', name: 'Michigan', expectedMin: 100 },
  { state: 'NJ', name: 'New Jersey', expectedMin: 80 },
  { state: 'VA', name: 'Virginia', expectedMin: 80 },
  { state: 'WA', name: 'Washington', expectedMin: 60 },
  { state: 'AZ', name: 'Arizona', expectedMin: 50 },
  { state: 'MA', name: 'Massachusetts', expectedMin: 50 },
  { state: 'TN', name: 'Tennessee', expectedMin: 80 },
  { state: 'IN', name: 'Indiana', expectedMin: 80 },
  { state: 'MD', name: 'Maryland', expectedMin: 60 },
  { state: 'WI', name: 'Wisconsin', expectedMin: 60 },
  { state: 'MN', name: 'Minnesota', expectedMin: 60 },
  { state: 'CO', name: 'Colorado', expectedMin: 50 },
  { state: 'SC', name: 'South Carolina', expectedMin: 50 },
  { state: 'MO', name: 'Missouri', expectedMin: 60 },
  { state: 'AL', name: 'Alabama', expectedMin: 60 },
  { state: 'LA', name: 'Louisiana', expectedMin: 60 },
  { state: 'KY', name: 'Kentucky', expectedMin: 60 },
  { state: 'OR', name: 'Oregon', expectedMin: 40 },
  { state: 'OK', name: 'Oklahoma', expectedMin: 40 },
  { state: 'CT', name: 'Connecticut', expectedMin: 30 },
  { state: 'UT', name: 'Utah', expectedMin: 30 },
  { state: 'NV', name: 'Nevada', expectedMin: 30 },
  { state: 'AR', name: 'Arkansas', expectedMin: 40 },
  { state: 'MS', name: 'Mississippi', expectedMin: 40 },
  { state: 'KS', name: 'Kansas', expectedMin: 40 },
  { state: 'NM', name: 'New Mexico', expectedMin: 30 },
  { state: 'NE', name: 'Nebraska', expectedMin: 30 },
  { state: 'WV', name: 'West Virginia', expectedMin: 30 },
  { state: 'ID', name: 'Idaho', expectedMin: 25 },
  { state: 'NH', name: 'New Hampshire', expectedMin: 20 },
  { state: 'ME', name: 'Maine', expectedMin: 20 },
  { state: 'RI', name: 'Rhode Island', expectedMin: 15 },
  { state: 'MT', name: 'Montana', expectedMin: 15 },
  { state: 'DE', name: 'Delaware', expectedMin: 15 },
  { state: 'SD', name: 'South Dakota', expectedMin: 15 },
  { state: 'ND', name: 'North Dakota', expectedMin: 15 },
  { state: 'VT', name: 'Vermont', expectedMin: 15 },
  { state: 'WY', name: 'Wyoming', expectedMin: 10 },
];

async function analyzeCoverage() {
  console.log('=== FREIGHT STATE COVERAGE ANALYSIS ===\n');
  console.log('Checking major freight states for adequate city coverage...\n');
  
  const needsWork = [];
  const adequate = [];
  
  for (const { state, name, expectedMin } of FREIGHT_STATES) {
    const { data, error } = await supabase
      .from('cities')
      .select('id', { count: 'exact', head: true })
      .eq('state_or_province', state);
    
    if (error) {
      console.error(`❌ Error querying ${state}:`, error.message);
      continue;
    }
    
    const count = data || 0;
    const status = count < expectedMin ? '⚠️ ' : '✅';
    
    console.log(`${status} ${state} (${name}): ${count} cities (expected: ${expectedMin}+)`);
    
    if (count < expectedMin) {
      needsWork.push({ state, name, count, expectedMin, gap: expectedMin - count });
    } else {
      adequate.push({ state, name, count });
    }
  }
  
  console.log('\n=== PRIORITY RECOMMENDATIONS ===\n');
  
  if (needsWork.length === 0) {
    console.log('✅ All major freight states have adequate coverage!');
  } else {
    console.log('States needing attention (sorted by gap):');
    needsWork.sort((a, b) => b.gap - a.gap);
    
    for (const { state, name, count, expectedMin, gap } of needsWork) {
      const priority = gap > 50 ? '🔴 HIGH' : gap > 20 ? '🟡 MEDIUM' : '🟢 LOW';
      console.log(`  ${priority} - ${state} (${name}): ${count} cities, need ${gap} more`);
    }
  }
  
  console.log('\n=== WELL-COVERED STATES ===\n');
  adequate.sort((a, b) => b.count - a.count).slice(0, 10).forEach(({ state, name, count }) => {
    console.log(`  ✅ ${state} (${name}): ${count} cities`);
  });
}

analyzeCoverage().catch(console.error);
