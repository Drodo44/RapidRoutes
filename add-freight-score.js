import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addFreightScore() {
  try {
    // Add freight_score column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE cities 
        ADD COLUMN IF NOT EXISTS freight_score float DEFAULT 1.0;
      `
    });

    if (alterError) {
      console.error('Error adding freight_score:', alterError);
      return;
    }

    // Add verification columns
    const { error: verifyError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE cities 
        ADD COLUMN IF NOT EXISTS dat_verified boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS dat_verified_count integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_dat_verification timestamptz,
        ADD COLUMN IF NOT EXISTS verification_history jsonb;
      `
    });

    if (verifyError) {
      console.error('Error adding verification columns:', verifyError);
      return;
    }

    console.log('Successfully added columns');

    // Update NULL values to defaults
    const { error: updateError } = await supabase
      .from('cities')
      .update({
        freight_score: 1.0,
        dat_verified: false,
        dat_verified_count: 0
      })
      .is('freight_score', null);

    if (updateError) {
      console.error('Error updating defaults:', updateError);
      return;
    }

    console.log('Successfully updated default values');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addFreightScore();
