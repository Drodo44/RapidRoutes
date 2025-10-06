// pages/api/lanes/crawl-cities.js// pages/api/lan  try {

// API to get crawl cities for dropdown functionality    // Get all active lanes

import { adminSupabase } from '../../../utils/supabaseAdminClient';    const { data: lanes, error: lanesError } = await adminSupabase

import { generateGeographicCrawlPairs } from '../../../lib/geographicCrawl.js';      .from('lanes')

      .select('*')

function cleanReferenceId(refId) {      .eq('lane_status', 'current')

  if (!refId) return '';      .order('created_at', { ascending: false });l-cities.js

  // Remove Excel text formatting like ="RR12345"// API to get crawl cities for dropdown functionality

  return String(refId).replace(/^="?|"?$/g, '');import { adminSupabase } from '../../../utils/supabaseAdminClient';

}import { generateGeographicCrawlPairs } from '../../../lib/geographicCrawl.js';



export default async function handler(req, res) {function cleanReferenceId(refId) {

  if (req.method !== 'GET') {  if (!refId) return '';

    return res.status(405).json({ error: 'Method not allowed' });  // Remove Excel text formatting like ="RR12345"

  }  return String(refId).replace(/^="?|"?$/g, '');

}

  try {

    // Get all current lanesexport default async function handler(req, res) {

    const { data: lanes, error } = await adminSupabase  if (req.method !== 'GET') {

      .from('lanes')    return res.status(405).json({ error: 'Method not allowed' });

      .select('*')  }

      .eq('lane_status', 'current')

      .order('created_at', { ascending: false })  try {

      .limit(200);    // Get all active lanes

    const { data: lanes, error } = await adminSupabase

    if (error) throw error;      .from('lanes')

      .select('*')

    const crawlData = [];      .in('status', ['pending', 'posted'])

      .order('created_at', { ascending: false })

    // Generate crawl cities for each lane      .limit(200);

    for (const lane of lanes) {

      try {    if (error) throw error;

        const result = await generateGeographicCrawlPairs({

          origin: {     const crawlData = [];

            city: lane.origin_city, 

            state: lane.origin_state,     // Generate crawl cities for each lane

            zip: lane.origin_zip     for (const lane of lanes) {

          },      try {

          destination: {         const result = await generateGeographicCrawlPairs({

            city: lane.dest_city,           origin: { 

            state: lane.dest_state,             city: lane.origin_city, 

            zip: lane.dest_zip             state: lane.origin_state, 

          },            zip: lane.origin_zip 

          equipment: lane.equipment_code,          },

          preferFillTo10: true          destination: { 

        });            city: lane.dest_city, 

            state: lane.dest_state, 

        // Add base lane info            zip: lane.dest_zip 

        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;          },

        crawlData.push({          equipment: lane.equipment_code,

          type: 'base',          preferFillTo10: true

          laneId: lane.id,        });

          referenceId: cleanRefId,

          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,        // Add base lane info

          isOriginal: true        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;

        });        crawlData.push({

          type: 'base',

        // Add crawl pairs          laneId: lane.id,

        result.pairs.forEach((pair, index) => {          referenceId: cleanRefId,

          crawlData.push({          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,

            type: 'crawl',          isOriginal: true

            laneId: lane.id,        });

            referenceId: cleanRefId,

            displayName: `${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`,        // Add crawl pairs

            isOriginal: false,        result.pairs.forEach((pair, index) => {

            crawlIndex: index + 1          crawlData.push({

          });            type: 'crawl',

        });            laneId: lane.id,

            referenceId: cleanRefId,

      } catch (error) {            displayName: `${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`,

        console.error(`Error generating crawl for lane ${lane.id}:`, error);            isOriginal: false,

        // Still add the base lane even if crawl generation fails            crawlIndex: index + 1

        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;          });

        crawlData.push({        });

          type: 'base',

          laneId: lane.id,      } catch (error) {

          referenceId: cleanRefId,        console.error(`Error generating crawl for lane ${lane.id}:`, error);

          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,        // Still add the base lane even if crawl generation fails

          isOriginal: true        const cleanRefId = cleanReferenceId(lane.reference_id) || `RR${String(lane.id).slice(-5)}`;

        });        crawlData.push({

      }          type: 'base',

    }          laneId: lane.id,

          referenceId: cleanRefId,

    res.status(200).json({ crawlData });          displayName: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,

  } catch (error) {          isOriginal: true

    console.error('Error getting crawl cities:', error);        });

    res.status(500).json({ error: error.message });      }

  }    }

}

    res.status(200).json({ crawlData });
  } catch (error) {
    console.error('Error getting crawl cities:', error);
    res.status(500).json({ error: error.message });
  }
}
