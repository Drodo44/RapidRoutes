// pages/api/admin/add-missing-cities.js
import { adminSupabase } from '../../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🏙️ Adding missing cities including Delanco, NJ...');
  
  const missingCities = [
    // Delanco, NJ - Philadelphia KMA (primary missing city)
    {
      city: 'Delanco',
      state_or_province: 'NJ',
      zip: '08075',
      latitude: 40.0465,
      longitude: -74.9532,
      kma_code: 'PHL',
      kma_name: 'Philadelphia'
    },
    
    // Other Philadelphia KMA cities
    {
      city: 'Riverside',
      state_or_province: 'NJ',
      zip: '08075',
      latitude: 40.0342,
      longitude: -74.9568,
      kma_code: 'PHL',
      kma_name: 'Philadelphia'
    },
    {
      city: 'Palmyra',
      state_or_province: 'NJ',
      zip: '08065',
      latitude: 40.0070,
      longitude: -75.0344,
      kma_code: 'PHL',
      kma_name: 'Philadelphia'
    },
    {
      city: 'Beverly',
      state_or_province: 'NJ',
      zip: '08010',
      latitude: 40.0659,
      longitude: -74.9276,
      kma_code: 'PHL',
      kma_name: 'Philadelphia'
    },
    
    // NC cities from previous searches
    {
      city: 'Seaboard',
      state_or_province: 'NC',
      zip: '27876',
      latitude: 36.4876,
      longitude: -77.4319,
      kma_code: 'RDU',
      kma_name: 'Raleigh-Durham'
    }
  ];
  
  let added = 0;
  let skipped = 0;
  const results = [];
  
  try {
    for (const city of missingCities) {
      try {
        // Check if city already exists
        const { data: existing } = await adminSupabase
          .from('cities')
          .select('id')
          .eq('city', city.city)
          .eq('state_or_province', city.state_or_province)
          .eq('zip', city.zip)
          .single();
          
        if (existing) {
          console.log(`⚠️  ${city.city}, ${city.state_or_province} ${city.zip} already exists`);
          results.push({ status: 'skipped', city: `${city.city}, ${city.state_or_province} ${city.zip}`, reason: 'already exists' });
          skipped++;
          continue;
        }
        
        // Insert new city
        const { error } = await adminSupabase
          .from('cities')
          .insert([city]);
          
        if (error) throw error;
        
        console.log(`✅ Added ${city.city}, ${city.state_or_province} ${city.zip}`);
        results.push({ status: 'added', city: `${city.city}, ${city.state_or_province} ${city.zip}` });
        added++;
        
      } catch (error) {
        console.error(`❌ Failed to add ${city.city}, ${city.state_or_province}:`, error.message);
        results.push({ status: 'error', city: `${city.city}, ${city.state_or_province}`, error: error.message });
      }
    }
    
    const summary = {
      added,
      skipped,
      total: missingCities.length,
      results
    };
    
    console.log(`\n🏙️ Cities update complete:`);
    console.log(`   ✅ Added: ${added}`);
    console.log(`   ⚠️  Skipped (existing): ${skipped}`);
    console.log(`   📍 Total processed: ${missingCities.length}`);
    
    return res.status(200).json(summary);
    
  } catch (error) {
    console.error('Error adding missing cities:', error);
    return res.status(500).json({ error: error.message });
  }
}
