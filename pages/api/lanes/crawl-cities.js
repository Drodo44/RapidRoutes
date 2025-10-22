// pages/api/lanes/crawl-cities.js
// API to get crawl cities for dropdown functionality
import supabaseAdmin from "@/lib/supabaseAdmin";
import { fetchLaneRecords } from '../../../services/laneService.js';
import { generateGeographicCrawlPairs } from '../../../lib/geographicCrawl.js';

function cleanReferenceId(refId) {
  if (!refId) return '';
  // Remove Excel text formatting like ="RR12345"
  return String(refId).replace(/^="?|"?$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all current lanes
    const lanes = await fetchLaneRecords(
      {
        status: 'current',
        limit: 200
      },
      adminSupabase
    );

    const crawlData = [];

    // Generate crawl cities for each lane
    for (const lane of lanes) {
      try {
        const result = await generateGeographicCrawlPairs({
          origin: { 
            city: lane.origin_city, 
            state: lane.origin_state, 
            zip: lane.origin_zip 
          },
          destination: { 
            city: lane.destination_city, 
            state: lane.destination_state, 
            zip: lane.dest_zip 
          },
          equipment: lane.equipment_code,
          preferFillTo10: true
        });

        // Add base lane info
        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;
        crawlData.push({
          type: 'base',
          laneId: lane.id,
          referenceId: cleanRefId,
          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city}, ${lane.destination_state}`,
          isOriginal: true
        });

        // Add crawl pairs
        result.pairs.forEach((pair, index) => {
          crawlData.push({
            type: 'crawl',
            laneId: lane.id,
            referenceId: cleanRefId,
            displayName: `${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`,
            isOriginal: false,
            crawlIndex: index + 1
          });
        });

      } catch (error) {
        console.error(`Error generating crawl for lane ${lane.id}:`, error);
        // Still add the base lane even if crawl generation fails
        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;
        crawlData.push({
          type: 'base',
          laneId: lane.id,
          referenceId: cleanRefId,
          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city}, ${lane.destination_state}`,
          isOriginal: true
        });
      }
    }

    res.status(200).json({ crawlData });
  } catch (error) {
    console.error('Error getting crawl cities:', error);
    res.status(500).json({ error: error.message });
  }
}
