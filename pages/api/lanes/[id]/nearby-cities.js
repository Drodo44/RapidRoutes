// ============================================================================
// API: Get nearby cities for a lane (live calculation using geographic crawl)
// ============================================================================
// Purpose: Provide prioritized pickup/delivery cities using latest intelligence
// Notes: Replaces stale JSONB snapshots that skewed toward NYC/Long Island
// ============================================================================

import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateGeographicCrawlPairs } from '../../../../lib/geographicCrawl.js';

const supabase = supabaseAdmin;

function buildKmaBucket(map, city, miles) {
  if (!city?.kma_code) return;
  const kma = city.kma_code;
  if (!map[kma]) {
    map[kma] = [];
  }

  const key = `${city.city}_${city.state || city.state_or_province}`.toUpperCase();
  const exists = map[kma].some(entry => `${entry.city}_${entry.state}`.toUpperCase() === key);
  if (exists) return;

  map[kma].push({
    city: city.city,
    state: city.state || city.state_or_province,
    zip: city.zip || '',
    kma_code: city.kma_code,
    kma_name: city.kma_name || null,
    miles: Math.round(Number.isFinite(miles) ? miles : city.distance || 0)
  });
}

async function loadCityMetadata(city, state) {
  if (!city || !state) return null;

  const { data, error } = await supabase
    .from('cities')
    .select('city, state_or_province, latitude, longitude, zip, kma_code, kma_name')
    .eq('state_or_province', state)
    .ilike('city', city)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[nearby-cities] Failed to load city metadata', { city, state, error: error.message });
    return null;
  }

  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('origin_city, origin_state, dest_city, dest_state, equipment_code')
      .eq('id', id)
      .single();

    if (laneError) throw laneError;
    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    const originMeta = await loadCityMetadata(lane.origin_city, lane.origin_state);
    const destMeta = await loadCityMetadata(lane.dest_city, lane.dest_state);

    if (!originMeta || !destMeta) {
      return res.status(422).json({
        error: 'Unable to load city metadata',
        originFound: !!originMeta,
        destinationFound: !!destMeta
      });
    }

    const crawlResult = await generateGeographicCrawlPairs({
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        latitude: originMeta.latitude,
        longitude: originMeta.longitude,
        zip: originMeta.zip,
        kma_code: originMeta.kma_code
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        latitude: destMeta.latitude,
        longitude: destMeta.longitude,
        zip: destMeta.zip,
        kma_code: destMeta.kma_code
      },
      equipment: lane.equipment_code,
      preferFillTo10: true
    });

    const pickupBuckets = {};
    const deliveryBuckets = {};

    const pairs = Array.isArray(crawlResult?.pairs) ? crawlResult.pairs : [];

    for (const pair of pairs) {
      buildKmaBucket(pickupBuckets, pair.origin, pair.origin?.distance);
      buildKmaBucket(deliveryBuckets, pair.destination, pair.destination?.distance);
    }

    if (originMeta?.kma_code) {
      const baseEntry = {
        city: lane.origin_city,
        state: lane.origin_state,
        zip: originMeta.zip || '',
        kma_code: originMeta.kma_code,
        kma_name: originMeta.kma_name || null,
        miles: 0
      };
      pickupBuckets[originMeta.kma_code] = [
        baseEntry,
        ...(pickupBuckets[originMeta.kma_code] || []).filter(c => c.city !== baseEntry.city)
      ];
    }

    if (destMeta?.kma_code) {
      const baseEntry = {
        city: lane.dest_city,
        state: lane.dest_state,
        zip: destMeta.zip || '',
        kma_code: destMeta.kma_code,
        kma_name: destMeta.kma_name || null,
        miles: 0
      };
      deliveryBuckets[destMeta.kma_code] = [
        baseEntry,
        ...(deliveryBuckets[destMeta.kma_code] || []).filter(c => c.city !== baseEntry.city)
      ];
    }

    res.status(200).json({
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        latitude: originMeta.latitude,
        longitude: originMeta.longitude,
        nearby_cities: { kmas: pickupBuckets }
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        latitude: destMeta.latitude,
        longitude: destMeta.longitude,
        nearby_cities: { kmas: deliveryBuckets }
      },
      lane_id: id
    });
  } catch (error) {
    console.error('[nearby-cities] Error generating cities', error);
    res.status(500).json({ error: error.message });
  }
}
