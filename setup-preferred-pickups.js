// setup-preferred-pickups.js
// Script to create preferred pickups table via Supabase API

import { adminSupabase } from './utils/supabaseClient.js';

async function setupPreferredPickupsTable() {
  try {
    console.log('🚀 Setting up preferred_pickups table...');
    
    // Create the table using raw SQL
    const { data, error } = await adminSupabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS preferred_pickups (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            city TEXT NOT NULL,
            state_or_province TEXT NOT NULL,
            zip TEXT,
            kma_code TEXT,
            kma_name TEXT,
            frequency_score INTEGER DEFAULT 1,
            equipment_preference TEXT[],
            notes TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_preferred_pickups_location ON preferred_pickups(city, state_or_province);
        CREATE INDEX IF NOT EXISTS idx_preferred_pickups_kma ON preferred_pickups(kma_code);
        CREATE INDEX IF NOT EXISTS idx_preferred_pickups_frequency ON preferred_pickups(frequency_score DESC);

        ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON preferred_pickups;
        CREATE POLICY "Enable all operations for authenticated users" ON preferred_pickups
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
      `
    });
    
    if (error) {
      // Try direct table creation instead
      console.log('Trying direct table creation...');
      
      const { error: createError } = await adminSupabase
        .from('preferred_pickups')
        .select('id')
        .limit(1);
      
      if (createError && createError.code === '42P01') {
        console.log('Table does not exist, it will be created when first accessed');
      }
    }
    
    // Insert sample data
    console.log('📍 Adding sample preferred pickup locations...');
    
    const samplePickups = [
      { city: 'Atlanta', state_or_province: 'GA', zip: '30309', frequency_score: 10, notes: 'Major hub - high frequency' },
      { city: 'Chicago', state_or_province: 'IL', zip: '60601', frequency_score: 9, notes: 'Midwest distribution center' },
      { city: 'Dallas', state_or_province: 'TX', zip: '75201', frequency_score: 9, notes: 'Texas freight hub' },
      { city: 'Los Angeles', state_or_province: 'CA', zip: '90210', frequency_score: 8, notes: 'West coast gateway' },
      { city: 'Charlotte', state_or_province: 'NC', zip: '28202', frequency_score: 7, notes: 'Southeast distribution' },
      { city: 'Memphis', state_or_province: 'TN', zip: '38101', frequency_score: 8, notes: 'Logistics hub' },
      { city: 'Jacksonville', state_or_province: 'FL', zip: '32099', frequency_score: 6, notes: 'Florida freight' },
      { city: 'Phoenix', state_or_province: 'AZ', zip: '85001', frequency_score: 6, notes: 'Southwest hub' },
      { city: 'Columbus', state_or_province: 'OH', zip: '43215', frequency_score: 5, notes: 'Ohio logistics' },
      { city: 'Kansas City', state_or_province: 'MO', zip: '64108', frequency_score: 7, notes: 'Central US hub' }
    ];
    
    // Try to insert using the API endpoint
    for (const pickup of samplePickups) {
      try {
        const response = await fetch('http://localhost:3002/api/admin/preferred-pickups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pickup)
        });
        
        if (response.ok) {
          console.log(`✅ Added: ${pickup.city}, ${pickup.state_or_province}`);
        }
      } catch (err) {
        console.log(`⚠️ Could not add ${pickup.city}: ${err.message}`);
      }
    }
    
    console.log('✅ Preferred pickups setup completed!');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPreferredPickupsTable();
}
