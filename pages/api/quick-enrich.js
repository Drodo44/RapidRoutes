// FAST city lookup from pre-computed database
// Replaces slow real-time ST_Distance calculations
import { adminSupabase as supabase } from '../../utils/supabaseAdminClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lanes } = req.body;
    
    if (!Array.isArray(lanes) || lanes.length === 0) {
      return res.status(400).json({ error: 'No lanes provided' });
    }

    console.log(`[Quick Enrich] Processing ${lanes.length} lanes`);
    
    const enriched = [];
    
    for (const lane of lanes) {
      // Fetch origin nearby cities from database
      const { data: originCity, error: originError } = await supabase
        .from('cities')
        .select('city, state_or_province, nearby_cities')
        .eq('city', lane.origin_city)
        .eq('state_or_province', lane.origin_state)
        .maybeSingle();
      
      if (originError) {
        console.error(`[Quick Enrich] Origin lookup failed:`, originError);
        continue;
      }
      
      // Fetch destination nearby cities from database
      const { data: destCity, error: destError } = await supabase
        .from('cities')
        .select('city, state_or_province, nearby_cities')
        .eq('city', lane.dest_city)
        .eq('state_or_province', lane.dest_state)
        .maybeSingle();
      
      if (destError) {
        console.error(`[Quick Enrich] Dest lookup failed:`, destError);
        continue;
      }
      
      // Extract cities from KMA groupings
      const originCities = [];
      const destCities = [];
      
      if (originCity?.nearby_cities?.kmas) {
        for (const kma in originCity.nearby_cities.kmas) {
          originCities.push(...originCity.nearby_cities.kmas[kma]);
        }
      }
      
      if (destCity?.nearby_cities?.kmas) {
        for (const kma in destCity.nearby_cities.kmas) {
          destCities.push(...destCity.nearby_cities.kmas[kma]);
        }
      }
      
      enriched.push({
        ...lane,
        origin_nearby: originCities,
        dest_nearby: destCities,
        origin_kmas: originCity?.nearby_cities?.kmas || {},
        dest_kmas: destCity?.nearby_cities?.kmas || {}
      });
    }
    
    console.log(`[Quick Enrich] Successfully enriched ${enriched.length} lanes`);
    
    res.status(200).json({
      ok: true,
      lanes: enriched,
      count: enriched.length
    });
    
  } catch (error) {
    console.error('[Quick Enrich] Error:', error);
    res.status(500).json({ error: error.message });
  }
}
