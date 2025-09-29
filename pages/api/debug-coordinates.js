// Debug the core issue
import { adminSupabase } from '../../utils/supabaseAdminClient.js';

export default async function handler(req, res) {
  try {
    // Check if Belvidere, IL exists and has coordinates
    const { data: belvidere } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', 'Belvidere')
      .ilike('state_or_province', 'IL')
      .limit(1);
    
    console.log('Belvidere found:', belvidere?.[0]);
    
    if (!belvidere?.[0]) {
      return res.status(200).json({ error: 'Belvidere not found' });
    }
    
    const base = belvidere[0];
    if (!base.latitude || !base.longitude) {
      return res.status(200).json({ error: 'Belvidere has no coordinates', city: base });
    }
    
    // Test the getNearbyCandidates logic manually
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
      .limit(1000); // Test with smaller set
    
    console.log(`Fetched ${allCities?.length} cities for distance calculation`);
    
    let validCities = 0;
    let nearbyCities = 0;
    
    for (const c of allCities || []) {
      if (c.latitude != null && c.longitude != null) {
        validCities++;
        
        // Simple distance calculation (Haversine approximation)
        const lat1 = base.latitude * Math.PI / 180;
        const lat2 = c.latitude * Math.PI / 180;
        const deltaLat = (c.latitude - base.latitude) * Math.PI / 180;
        const deltaLon = (c.longitude - base.longitude) * Math.PI / 180;
        
        const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
        const d = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 3959; // Earth radius in miles
        
        if (d <= 75 && !(c.city === base.city && c.state_or_province === base.state_or_province)) {
          nearbyCities++;
        }
      }
    }
    
    return res.status(200).json({
      base: {
        city: base.city,
        state: base.state_or_province,
        lat: base.latitude,
        lon: base.longitude
      },
      totalCities: allCities?.length,
      validCoordinates: validCities,
      nearby75Miles: nearbyCities,
      issue: nearbyCities === 0 ? 'NO_NEARBY_CITIES' : 'SHOULD_WORK'
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ error: error.message });
  }
}
