// fix-reference-ids.js - Simple script to fix duplicate reference IDs
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixReferenceIds() {
  console.log('Starting to fix reference IDs...');
  
  try {
    // Fetch all lanes
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('id, reference_id');

    if (error) {
      console.error('Error fetching lanes:', error);
      return;
    }

    console.log(`Found ${lanes.length} lanes total`);

    let fixedCount = 0;
    let errorCount = 0;

    // Fix each lane's reference ID based on its ID
    for (const lane of lanes) {
      const correctRefId = `RR${String(lane.id).padStart(5, '0')}`;
      
      if (lane.reference_id !== correctRefId) {
        console.log(`Fixing lane ${lane.id}: ${lane.reference_id || 'NULL'} → ${correctRefId}`);
        
        const { error: updateError } = await supabase
          .from('lanes')
          .update({ reference_id: correctRefId })
          .eq('id', lane.id);

        if (updateError) {
          console.error(`Error updating lane ${lane.id}:`, updateError);
          errorCount++;
        } else {
          fixedCount++;
        }
      }
    }

    console.log(`\nCompleted: ${fixedCount} fixed, ${errorCount} errors`);

  } catch (error) {
    console.error('Script failed:', error);
  }
}

fixReferenceIds();
