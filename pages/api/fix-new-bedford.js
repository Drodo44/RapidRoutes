// pages/api/fix-new-bedford.js
// Emergency API to add New Bedford, MA to cities database

import { adminSupabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🚨 EMERGENCY: Adding New Bedford, MA to cities database...');
    
    // Check if it already exists
    const { data: existing } = await adminSupabase
      .from('cities')
      .select('*')
      .eq('city', 'New Bedford')
      .eq('state_or_province', 'MA')
      .limit(1);
    
    if (existing?.length > 0) {
      console.log('✅ New Bedford already exists in database');
      return res.status(200).json({ 
        success: true, 
        message: 'New Bedford already exists',
        city: existing[0]
      });
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
      return res.status(500).json({ error: error.message });
    }
    
    console.log('✅ Successfully added New Bedford, MA');
    
    // Check for nearby cities in Boston area
    const { data: nearby } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .eq('state_or_province', 'MA')
      .eq('kma_code', 'BOS')
      .limit(10);
      
    console.log(`📍 Found ${nearby?.length || 0} other cities in Boston Market`);
    
    return res.status(200).json({ 
      success: true, 
      message: 'New Bedford added successfully',
      city: data[0],
      nearby_cities: nearby?.length || 0
    });
    
  } catch (error) {
    console.error('💥 Failed to add New Bedford:', error);
    return res.status(500).json({ error: error.message });
  }
}
