// pages/api/debug-cities.js
import { adminSupabase } from '../../utils/supabaseAdminClient';

export default async function handler(req, res) {
  try {
    // Get some of your actual lanes
    const { data: lanes, error: lanesError } = await adminSupabase
      .from('lanes')
      .select('origin_city, origin_state, dest_city, dest_state')
      .eq('status', 'pending')
      .limit(5);
    
    if (lanesError) throw lanesError;
    
    console.log('Found lanes:', lanes);
    
    // Check if these cities exist in our cities table
    const results = [];
    
    for (const lane of lanes) {
      const { data: originCity } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, kma_code')
        .ilike('city', lane.origin_city)
        .ilike('state_or_province', lane.origin_state)
        .limit(1);
      
      const { data: destCity } = await adminSupabase
        .from('cities')
        .select('city, state_or_province, kma_code')
        .ilike('city', lane.dest_city)
        .ilike('state_or_province', lane.dest_state)
        .limit(1);
      
      results.push({
        lane: `${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`,
        originFound: originCity?.length > 0,
        destFound: destCity?.length > 0,
        originData: originCity?.[0] || null,
        destData: destCity?.[0] || null
      });
    }
    
    res.status(200).json({
      success: true,
      lanes: results,
      summary: {
        totalLanes: lanes.length,
        originsFound: results.filter(r => r.originFound).length,
        destsFound: results.filter(r => r.destFound).length
      }
    });
    
  } catch (error) {
    console.error('Debug cities error:', error);
    res.status(500).json({ error: error.message });
  }
}
