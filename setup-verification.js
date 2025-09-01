import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function setupVerification() {
  try {
    // Update some test cities with verification data
    const cities = ['Cincinnati', 'Columbus', 'Chicago', 'Indianapolis', 'Atlanta', 'Charlotte'];
    
    for (const city of cities) {
      console.log(`Updating ${city}...`);
      
      const { data: cityData, error: findError } = await supabase
        .from('cities')
        .select('id, city')
        .ilike('city', city)
        .limit(1);

      if (findError) {
        console.error(`Error finding ${city}:`, findError);
        continue;
      }

      if (!cityData?.[0]?.id) {
        console.warn(`City not found: ${city}`);
        continue;
      }

      const { error: updateError } = await supabase
        .from('cities')
        .update({
          dat_verified: true,
          dat_verified_count: 5,
          last_dat_verification: new Date().toISOString(),
          verification_history: JSON.stringify({
            last_success: new Date().toISOString(),
            successful_postings: 5
          })
        })
        .eq('id', cityData[0].id);

      if (updateError) {
        console.error(`Error updating ${city}:`, updateError);
      } else {
        console.log(`✓ Updated ${city}`);
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupVerification();
