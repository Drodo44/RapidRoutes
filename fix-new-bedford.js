// Emergency fix: Add New Bedford, MA to cities database
import { adminSupabase } from './utils/supabaseClient.js';

async function addNewBedford() {
  console.log('🚨 EMERGENCY: Adding New Bedford, MA to cities database...');
  
  try {
    // Check if it already exists
    const { data: existing } = await adminSupabase
      .from('cities')
      .select('*')
      .eq('city', 'New Bedford')
      .eq('state_or_province', 'MA')
      .limit(1);
    
    if (existing?.length > 0) {
      console.log('✅ New Bedford already exists in database:', existing[0]);
      return;
    }
    
    // Add New Bedford, MA
    const { data, error } = await adminSupabase
      .from('cities')
      .insert({
        city: 'New Bedford',
        state_or_province: 'MA', 
        zip: '02745',
        latitude: 41.6362,
        longitude: -70.9342,
        kma_code: 'BOS',
        kma_name: 'Boston Market'
      })
      .select();
    
    if (error) {
      console.error('❌ Error adding New Bedford:', error);
      throw error;
    }
    
    console.log('✅ Successfully added New Bedford, MA:', data[0]);
    
    // Also check for nearby cities in Boston area to ensure good crawling
    const { data: nearby } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .eq('state_or_province', 'MA')
      .in('kma_code', ['BOS'])
      .limit(10);
      
    console.log(`📍 Found ${nearby?.length || 0} other cities in Boston Market for diversity`);
    console.log('Sample Boston area cities:', nearby?.slice(0, 5).map(c => c.city).join(', '));
    
  } catch (error) {
    console.error('💥 Failed to add New Bedford:', error);
  }
}

addNewBedford();
