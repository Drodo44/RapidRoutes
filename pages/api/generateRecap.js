// pages/api/generateRecap.js
import supabaseAdmin from "@/lib/supabaseAdmin";
import { generateRecapHTML } from '../../lib/recapUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { laneIds } = req.body;
    
    if (!laneIds || !Array.isArray(laneIds) || !laneIds.length) {
      return res.status(400).json({ error: 'Lane IDs are required' });
    }

    // Fetch lanes data
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .in('id', laneIds);
      
    if (error) throw error;
    
    if (!lanes || lanes.length === 0) {
      return res.status(404).json({ error: 'No lanes found with the provided IDs' });
    }
    
    // Generate recap for each lane
    const results = [];
    for (const lane of lanes) {
      const recap = await generateRecapHTML(lane);
      results.push({
        laneId: lane.id,
        route: `${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`,
        equipmentCode: lane.equipment_code,
        html: recap.html,
        sellingPoints: recap.sellingPoints,
        weatherInfo: recap.weatherInfo,
      });
    }
    
    return res.status(200).json({ results });
  } catch (error) {
    console.error('Generate Recap error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate recap' });
  }
}
