// pages/api/getPostedPairs.js
// Get the posted city pairs for a specific lane to enable smart recap matching

import { adminSupabase as supabase } from '../../utils/supabaseClient.js';
import { getCitiesInRadius } from '../../lib/cityUtils.js';

export default async function handler(req, res) {
  try {
    const { laneId } = req.query;
    
    if (!laneId) {
      return res.status(400).json({ error: 'Lane ID required' });
    }

    // Get the original lane
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('*')
      .eq('id', laneId)
      .single();

    if (laneError) {
      throw new Error(`Failed to fetch lane: ${laneError.message}`);
    }

    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    // Simulate the crawl process to get the posted pairs
    const pickupCandidates = await getCitiesInRadius(
      lane.origin_city,
      lane.origin_state,
      lane.origin_zip || null,
      125 // max radius
    );

    const deliveryCandidates = await getCitiesInRadius(
      lane.dest_city,
      lane.dest_state,
      lane.dest_zip || null,
      125 // max radius
    );

    // Generate the same pairs that would have been posted
    // This is a simplified version - in production, you'd want to store the actual posted pairs
    const postedPairs = [];
    
    // Take up to 12 combinations (to match the 12 rows per lane)
    const maxPairs = Math.min(12, pickupCandidates.length * deliveryCandidates.length);
    let pairCount = 0;

    for (let i = 0; i < pickupCandidates.length && pairCount < maxPairs; i++) {
      for (let j = 0; j < deliveryCandidates.length && pairCount < maxPairs; j++) {
        const pickup = pickupCandidates[i];
        const delivery = deliveryCandidates[j];
        
        postedPairs.push({
          id: `${laneId}-${i}-${j}`,
          laneId: laneId,
          pickup: {
            city: pickup.city,
            state: pickup.state_or_province,
            zip: pickup.zip,
            kma: pickup.kma_name
          },
          delivery: {
            city: delivery.city,
            state: delivery.state_or_province,
            zip: delivery.zip,
            kma: delivery.kma_name
          }
        });
        
        pairCount++;
      }
    }

    res.status(200).json({
      lane,
      postedPairs,
      totalPairs: postedPairs.length
    });

  } catch (error) {
    console.error('Error fetching posted pairs:', error);
    res.status(500).json({ error: error.message });
  }
}
