import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gwuhjxomavulwduhvgvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ'
);

// Map any remaining non-standard codes to proper DAT codes
const fixKmaMapping = {
  'AL_BIR': 'BHM',
  'SC_COL': 'CAE',
  'AGS': 'AGS',
  'ALB': 'ALB',
  // Add any other mappings needed based on actual data
};

async function cleanupRemainingKmas() {
  console.log('Starting final KMA cleanup...');
  
  try {
    // Get cities with non-standard KMA codes
    const { data: cities } = await supabase
      .from('cities')
      .select('*')
      .not('kma_code', 'is', null)
      .not('kma_code', 'similar to', '[A-Z]{3}');
      
    if (!cities?.length) {
      console.log('No cities with non-standard KMA codes found.');
      return;
    }
    
    console.log(`Found ${cities.length} cities with non-standard KMA codes.`);
    
    let updates = 0;
    for (const city of cities) {
      const newKma = fixKmaMapping[city.kma_code];
      
      if (newKma) {
        const { error: updateError } = await supabase
          .from('cities')
          .update({ kma_code: newKma })
          .eq('id', city.id);
          
        if (updateError) {
          console.error(`Failed to update ${city.city}, ${city.state_or_province}:`, updateError);
          continue;
        }
        
        updates++;
        console.log(`✅ Updated ${city.city}, ${city.state_or_province}: ${city.kma_code} → ${newKma}`);
      }
    }
    
    console.log(`\nCompleted ${updates} final updates.`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

cleanupRemainingKmas();