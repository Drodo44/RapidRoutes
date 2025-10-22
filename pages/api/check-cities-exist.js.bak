// Quick check if our lane cities exist in database after deduplication
import { adminSupabase as supabase } from '../../utils/supabaseAdminClient.js';

export default async function handler(req, res) {
  try {
    // Get actual lane cities from our database
    const { data: lanes } = await supabase
      .from('lanes')
      .select('origin_city, origin_state, dest_city, dest_state')
      .limit(5);

    const results = [];
    
    for (const lane of lanes || []) {
      // Check if origin city exists in cities table
      const { data: originData } = await supabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code')
        .ilike('city', lane.origin_city)
        .ilike('state_or_province', lane.origin_state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(3);
      
      // Check if dest city exists in cities table  
      const { data: destData } = await supabase
        .from('cities')
        .select('city, state_or_province, zip, latitude, longitude, kma_code')
        .ilike('city', lane.dest_city)
        .ilike('state_or_province', lane.dest_state)
        .not('latitude', 'is', null)
        .not('kma_code', 'is', null)
        .limit(3);
      
      results.push({
        lane: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
        originFound: originData?.length || 0,
        destFound: destData?.length || 0,
        originSample: originData?.[0] || null,
        destSample: destData?.[0] || null
      });
    }
    
    res.status(200).json({
      success: true,
      totalLanes: lanes?.length || 0,
      cityChecks: results
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
