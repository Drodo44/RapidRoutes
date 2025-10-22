// pages/api/getPostedPairs.js
// Get the actual posted city pairs for a specific lane by regenerating them using the same logic as CSV export

import supabaseAdmin from "@/lib/supabaseAdmin";
import { FreightIntelligence } from '../../lib/FreightIntelligence.js';

// Use the same singleton pattern as CSV generation
let intelligenceInstance = null;
function getFreightIntelligence() {
    if (!intelligenceInstance) {
        intelligenceInstance = new FreightIntelligence();
    }
    return intelligenceInstance;
}

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

    // Only return pairs for current lanes
    // Check both status and lane_status fields for compatibility
    const laneStatus = lane.lane_status || lane.status;
    if (laneStatus !== 'current') {
      return res.status(200).json({
        lane,
        postedPairs: [],
        totalPairs: 0,
        message: 'Lane not current yet'
      });
    }

    // Use the EXACT same logic as CSV generation to get the pairs
    const intelligence = getFreightIntelligence();
    
    let result;
    try {
      result = await intelligence.generateDiversePairs({
        origin: { 
          city: lane.origin_city, 
          state: lane.origin_state,
          zip: lane.origin_zip
        },
        destination: { 
          city: lane.dest_city, 
          state: lane.dest_state,
          zip: lane.dest_zip
        },
        equipment: lane.equipment_code,
        preferFillTo10: true // Same as CSV generation
      });
    } catch (pairError) {
      console.error(`Failed to generate pairs for lane ${laneId}:`, pairError);
      throw new Error(`Failed to generate pairs: ${pairError.message}`);
    }

    // Process pairs exactly as done in CSV generation
    const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
    
    // Validate pairs with same logic as CSV builder
    const validPairs = pairs.filter(pair => {
      if (!pair || typeof pair !== 'object') return false;
      
      // Handle both 'state' and 'state_or_province' field names from database
      const pickupState = pair.pickup?.state || pair.pickup?.state_or_province;
      const deliveryState = pair.delivery?.state || pair.delivery?.state_or_province;
      
      const hasPickup = pair.pickup && pair.pickup.city && pickupState;
      const hasDelivery = pair.delivery && pair.delivery.city && deliveryState;
      
      return hasPickup && hasDelivery;
    });

    // Convert to the format expected by the recap page
    const postedPairs = validPairs.map((pair, index) => ({
      id: `pair-${laneId}-${index}`,
      laneId: laneId, // Keep as UUID, don't parseInt!
      isBase: false,
      display: `${pair.pickup.city}, ${pair.pickup?.state || pair.pickup?.state_or_province} → ${pair.delivery.city}, ${pair.delivery?.state || pair.delivery?.state_or_province}`,
      // Generate reference ID on-the-fly using SAME logic as CSV export
      referenceId: lane.reference_id || (() => {
        const laneId = String(lane.id);
        const numericPart = laneId.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
        const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
        return `RR${referenceNum}`;
      })(),
      pickup: {
        city: pair.pickup.city,
        state: pair.pickup?.state || pair.pickup?.state_or_province,
        zip: pair.pickup?.zip || ''
      },
      delivery: {
        city: pair.delivery.city,
        state: pair.delivery?.state || pair.delivery?.state_or_province,
        zip: pair.delivery?.zip || ''
      }
    }));

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
