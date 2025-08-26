// setup-preferred-pickups.js
// Script to create preferred pickups table and add your specific pickup locations

import { adminSupabase } from './utils/supabaseClient.js';

async function setupPreferredPickupsTable() {
  try {
    console.log('🚀 Setting up preferred_pickups table for your specific locations...');
    
    // First try to see if table exists
    const { data: testData, error: testError } = await adminSupabase
      .from('preferred_pickups')
      .select('id')
      .limit(1);
    
    if (testError && testError.code === '42P01') {
      console.log('❌ preferred_pickups table does not exist.');
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:');
      console.log(`
CREATE TABLE preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default_user',
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

CREATE INDEX idx_preferred_pickups_user_active ON preferred_pickups(user_id, active);
CREATE INDEX idx_preferred_pickups_frequency ON preferred_pickups(frequency_score DESC);
      `);
      return;
    }
    
    // Insert YOUR specific preferred pickup locations
    console.log('📍 Adding YOUR preferred pickup locations...');
    
    const yourPickups = [
      { 
        user_id: 'default_user',
        city: 'Maplesville', 
        state_or_province: 'AL', 
        zip: '36750', 
        frequency_score: 6, 
        equipment_preference: ['FD', 'V'], 
        notes: 'You have 6 loads picking up here - high frequency location' 
      },
      { 
        user_id: 'default_user',
        city: 'Seaboard', 
        state_or_province: 'NC', 
        zip: '27876', 
        frequency_score: 6, 
        equipment_preference: ['FD', 'V', 'R'], 
        notes: 'You have 6 loads picking up here - high frequency location' 
      },
      // Add some nearby cities that would work well for crawling
      { 
        user_id: 'default_user',
        city: 'Montgomery', 
        state_or_province: 'AL', 
        zip: '36104', 
        frequency_score: 4, 
        equipment_preference: ['FD', 'V'], 
        notes: 'Alabama state capital - good backup for Maplesville area' 
      },
      { 
        user_id: 'default_user',
        city: 'Raleigh', 
        state_or_province: 'NC', 
        zip: '27601', 
        frequency_score: 4, 
        equipment_preference: ['FD', 'V', 'R'], 
        notes: 'NC state capital - good backup for Seaboard area' 
      },
      { 
        user_id: 'default_user',
        city: 'Atlanta', 
        state_or_province: 'GA', 
        zip: '30309', 
        frequency_score: 3, 
        equipment_preference: ['FD', 'V', 'R'], 
        notes: 'Major freight hub - always good for diversity' 
      }
    ];
    
    // Use upsert to avoid duplicates
    const { data: insertData, error: insertError } = await adminSupabase
      .from('preferred_pickups')
      .upsert(yourPickups, { 
        onConflict: 'user_id,city,state_or_province',
        ignoreDuplicates: false 
      })
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return;
    }
    
    console.log(`✅ Added ${insertData?.length || yourPickups.length} preferred pickup locations!`);
    
    // Verify the data
    const { data: verifyData, error: verifyError } = await adminSupabase
      .from('preferred_pickups')
      .select('*')
      .eq('user_id', 'default_user')
      .order('frequency_score', { ascending: false });
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
      return;
    }
    
    console.log(`\n📊 Your preferred pickup locations (${verifyData?.length || 0} total):`);
    verifyData?.forEach(pickup => {
      console.log(`   🚛 ${pickup.city}, ${pickup.state_or_province} (frequency: ${pickup.frequency_score}, equipment: ${pickup.equipment_preference?.join(', ') || 'any'})`);
      console.log(`       Notes: ${pickup.notes}`);
    });
    
    console.log('\n✅ Setup complete! Now the intelligent crawl will use YOUR actual pickup preferences.');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupPreferredPickupsTable();
}
