// check-actual-counts.mjs
// Quick check of actual city counts

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCounts() {
  console.log('=== ACTUAL CITY COUNTS ===\n');
  
  const states = ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI', 
                  'NJ', 'VA', 'WA', 'MA', 'TN', 'IN', 'MD', 'CT', 'NH', 'ME', 'VT', 'RI'];
  
  for (const state of states) {
    const { count, error } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
      .eq('state_or_province', state);
    
    if (error) {
      console.error(`Error for ${state}:`, error.message);
    } else {
      console.log(`${state}: ${count} cities`);
    }
  }
}

checkCounts().catch(console.error);
