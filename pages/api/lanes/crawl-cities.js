// pages/api/lanes/crawl-cities.js
// API to get crawl cities for dropdown functionality
import { fetchLaneRecords } from '../../../services/laneService.js';
import { generateGeographicCrawlPairs } from '../../../lib/geographicCrawl.js';
import supabaseAdmin from '@/lib/supabaseAdmin';

const adminSupabase = supabaseAdmin;

async function loadCityMetadata(city, state) {
  if (!city || !state) {
    return null;
  }

  const { data, error } = await adminSupabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, zip, kma_code, kma_name')
    .eq('state_or_province', state)
    .ilike('city', city)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[crawl-cities] Failed to load city metadata', { city, state, error: error.message });
    return null;
  }

  return data || null;
}

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
    const lanes = await fetchLaneRecords({
      status: 'current',
      limit: 200
    });

    const crawlData = [];

    // Generate crawl cities for each lane
    for (const lane of lanes) {
      try {
        const originMeta = await loadCityMetadata(lane.origin_city, lane.origin_state);
        const destinationMeta = await loadCityMetadata(lane.destination_city, lane.destination_state);

        if (!originMeta || !destinationMeta) {
          console.warn('[crawl-cities] Missing city metadata, skipping lane', {
            laneId: lane.id,
            originFound: !!originMeta,
            destinationFound: !!destinationMeta
          });
          continue;
        }

        const result = await generateGeographicCrawlPairs({
          origin: { 
            city: lane.origin_city, 
            state: lane.origin_state, 
            zip: lane.origin_zip,
            latitude: originMeta.latitude,
            longitude: originMeta.longitude,
            kma_code: originMeta.kma_code
          },
          destination: { 
            city: lane.destination_city, 
            state: lane.destination_state, 
            zip: lane.destination_zip,
            latitude: destinationMeta.latitude,
            longitude: destinationMeta.longitude,
            kma_code: destinationMeta.kma_code
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
    console.error('[crawl-cities API ERROR]', error);
    res.status(500).json({ ok: false, message: error.message });
  }
}
