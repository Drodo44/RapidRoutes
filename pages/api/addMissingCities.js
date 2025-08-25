// pages/api/addMissingCities.js
// Quick fix to add missing cities to database

import { adminSupabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Adding missing cities to database...');
    
    const cities = [
      {
        city: 'Berlin',
        state_or_province: 'NJ',
        zip: '08009',
        kma_code: 'NJ_PHI',
        kma_name: 'Philadelphia',
        latitude: 39.7909,
        longitude: -74.9286
      },
      {
        city: 'Oakland',
        state_or_province: 'NJ', 
        zip: '07436',
        kma_code: 'NJ_ELI',
        kma_name: 'Elizabeth',
        latitude: 41.0262,
        longitude: -74.2376
      }
    ];
    
    const results = [];
    
    for (const city of cities) {
      // Check if city already exists
      const { data: existing } = await adminSupabase
        .from('cities')
        .select('id')
        .eq('city', city.city)
        .eq('state_or_province', city.state_or_province)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`City already exists: ${city.city}, ${city.state_or_province}`);
        results.push({ city: `${city.city}, ${city.state_or_province}`, status: 'already_exists' });
        continue;
      }
      
      const { data, error } = await adminSupabase
        .from('cities')
        .insert(city)
        .select();
      
      if (error) {
        console.error('Error adding city:', city.city, error);
        results.push({ city: `${city.city}, ${city.state_or_province}`, status: 'error', error: error.message });
      } else {
        console.log('✅ Added:', city.city + ', ' + city.state_or_province);
        results.push({ city: `${city.city}, ${city.state_or_province}`, status: 'added' });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Cities processed',
      results
    });
    
  } catch (error) {
    console.error('Error in addMissingCities:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to add cities' 
    });
  }
}
