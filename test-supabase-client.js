// Test script for Supabase client configuration
import { adminSupabase as supabase } from './utils/supabaseClient.js';

async function testSupabaseConnection() {
  console.log('Testing Supabase client configuration...');
  
  try {
    // Test the connection by querying a simple table
    const { data, error } = await supabase
      .from('cities')
      .select('city, state_or_province')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('Sample data:', data);
    
    // Test the RPC function
    console.log('\nTesting find_cities_within_radius function...');
    
    // Atlanta, GA coordinates
    const lat = 33.749;
    const lng = -84.388;
    
    const { data: cities, error: rpcError } = await supabase
      .rpc('find_cities_within_radius', {
        lat_param: lat,
        lng_param: lng,
        radius_miles: 50
      });
    
    if (rpcError) {
      console.error('❌ RPC function error:', rpcError);
      return;
    }
    
    console.log(`✅ RPC function returned ${cities.length} cities within 50 miles of Atlanta, GA`);
    console.log('First 3 cities:', cities.slice(0, 3));
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testSupabaseConnection();