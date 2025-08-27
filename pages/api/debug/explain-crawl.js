import { adminSupabase } from '../../../utils/supabaseClient.js';
import { generateGeographicCrawlPairs, findCitiesNearLocation } from '../../../lib/geographicCrawl.js';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default async function handler(req, res) {
  try {
    const { laneId, origin_city, origin_state, dest_city, dest_state, equipment } = req.query;

    let origin = null;
    let destination = null;

    if (laneId) {
      const { data: lane } = await adminSupabase.from('lanes').select('origin_city, origin_state, dest_city, dest_state, equipment_code').eq('id', laneId).limit(1).single();
      if (!lane) return res.status(404).json({ error: 'Lane not found' });
      origin = { city: lane.origin_city, state: lane.origin_state };
      destination = { city: lane.dest_city, state: lane.dest_state };
    } else {
      if (!origin_city || !origin_state || !dest_city || !dest_state) {
        return res.status(400).json({ error: 'Provide laneId or origin_city, origin_state, dest_city, dest_state' });
      }
      origin = { city: origin_city, state: origin_state };
      destination = { city: dest_city, state: dest_state };
    }

    // Resolve base origin/destination from cities table
    const [{ data: originData }, { data: destData }] = await Promise.all([
      adminSupabase.from('cities').select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name').ilike('city', origin.city).ilike('state_or_province', origin.state).limit(1),
      adminSupabase.from('cities').select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name').ilike('city', destination.city).ilike('state_or_province', destination.state).limit(1)
    ]);

    if (!originData?.[0] || !destData?.[0]) {
      return res.status(404).json({ error: 'Base origin or destination not found in cities table' });
    }

    const baseOrigin = originData[0];
    const baseDest = destData[0];

    // Broad raw query for candidates around origin and destination (no KMA filtering)
    const maxDistanceMiles = 75;
    const latRangeO = maxDistanceMiles / 69;
    const lonRangeO = maxDistanceMiles / (69 * Math.cos(baseOrigin.latitude * Math.PI / 180));
    const latRangeD = maxDistanceMiles / 69;
    const lonRangeD = maxDistanceMiles / (69 * Math.cos(baseDest.latitude * Math.PI / 180));

    const [rawOResp, rawDResp] = await Promise.all([
      adminSupabase.from('cities').select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name').gte('latitude', baseOrigin.latitude - latRangeO).lte('latitude', baseOrigin.latitude + latRangeO).gte('longitude', baseOrigin.longitude - lonRangeO).lte('longitude', baseOrigin.longitude + lonRangeO).limit(2000),
      adminSupabase.from('cities').select('city, state_or_province, zip, latitude, longitude, kma_code, kma_name').gte('latitude', baseDest.latitude - latRangeD).lte('latitude', baseDest.latitude + latRangeD).gte('longitude', baseDest.longitude - lonRangeD).lte('longitude', baseDest.longitude + lonRangeD).limit(2000),
    ]);

    const rawOriginCities = rawOResp.data || [];
    const rawDestCities = rawDResp.data || [];

    const longIslandNames = ['montauk','hempstead','babylon','islip','southampton','riverhead','huntington','brentwood','napeague','east hampton','hampton'];

    function explainList(rawList, base) {
      return rawList.map(c => {
        const cityName = (c.city || '').toLowerCase();
        const stateName = (c.state_or_province || '').toLowerCase();
        const lat = Number(c.latitude);
        const lon = Number(c.longitude);
        const distance = (Number.isFinite(lat) && Number.isFinite(lon)) ? Math.round(calculateDistance(base.latitude, base.longitude, lat, lon)) : null;
        const synthetic_name = /metro|zone|region|area|corridor|district/i.test(c.city || '');
        const missing_kma = !c.kma_code;
        const same_kma_as_base = c.kma_code && base.kma_code && String(c.kma_code).toLowerCase() === String(base.kma_code).toLowerCase();
        const isLongIslandName = longIslandNames.some(n => cityName.includes(n));
        const isLongIslandBox = Number.isFinite(lon) && Number.isFinite(lat) && (lon >= -74.8 && lon <= -71.6 && lat >= 40.5 && lat <= 41.3);
        const banned_long_island = stateName === 'ny' && (isLongIslandName || isLongIslandBox);
        const out_of_range = distance == null ? true : distance > maxDistanceMiles;

        // Determine whether findCitiesNearLocation would KEEP this city based on its rules
        const wouldKeep = !synthetic_name && !missing_kma && !same_kma_as_base && !banned_long_island && !out_of_range && Number.isFinite(lat) && Number.isFinite(lon);

        return {
          city: c.city,
          state: c.state_or_province,
          zip: c.zip || '',
          latitude: c.latitude,
          longitude: c.longitude,
          kma_code: c.kma_code || null,
          kma_name: c.kma_name || null,
          distance,
          synthetic_name,
          missing_kma,
          same_kma_as_base,
          banned_long_island,
          out_of_range,
          wouldKeep
        };
      }).sort((a,b) => (a.distance || 999) - (b.distance || 999));
    }

    const explainedOrigin = explainList(rawOriginCities, baseOrigin);
    const explainedDest = explainList(rawDestCities, baseDest);

    // Call the actual geographic crawl to show final pairs
    const crawlResult = await generateGeographicCrawlPairs({ origin: { city: baseOrigin.city, state: baseOrigin.state_or_province }, destination: { city: baseDest.city, state: baseDest.state_or_province }, equipment: equipment || null, preferFillTo10: true, usedCities: new Set() });

    return res.status(200).json({
      baseOrigin,
      baseDest,
      explainedOrigin,
      explainedDest,
      crawlResult
    });

  } catch (error) {
    console.error('explain-crawl error:', error);
    return res.status(500).json({ error: String(error.message || error) });
  }
}
