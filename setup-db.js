import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  // Add columns one by one using updates
  try {
    console.log('Adding freight_score...');
    await supabase.from('cities').update({ freight_score: 1.0 }).is('freight_score', null);
    
    console.log('Adding dat_verified...');
    await supabase.from('cities').update({ dat_verified: false }).is('dat_verified', null);
    
    console.log('Adding dat_verified_count...');
    await supabase.from('cities').update({ dat_verified_count: 0 }).is('dat_verified_count', null);
    
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  }
}

setupDatabase();
