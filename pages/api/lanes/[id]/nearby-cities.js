// ============================================================================
// API: Get nearby cities for a lane (live calculation using geographic crawl)
// ============================================================================
// Purpose: Provide prioritized pickup/delivery cities using latest intelligence
// Notes: Replaces stale JSONB snapshots that skewed toward NYC/Long Island
// ============================================================================

import supabaseAdmin from '@/lib/supabaseAdmin';
import { generateGeographicCrawlPairs } from '../../../../lib/geographicCrawl.js';

// Business rule: exclude NYC/Long Island KMAs for New England deliveries
const NYC_LI_KMA_BLOCKLIST = new Set([
  'NY_BRN', 'NY_BKN', 'NY_NYC', 'NY_QUE', 'NY_BRX', 'NY_STA', 'NY_NAS', 'NY_SUF'
]);
const NEW_ENGLAND = new Set(['MA', 'NH', 'ME', 'VT', 'RI', 'CT']);

function normalizeState(state) {
  if (!state) return '';
  const s = String(state).trim();
  const upper = s.toUpperCase();
  if (upper.length === 2) return upper;
  const map = {
    'MASSACHUSETTS': 'MA',
    'NEW HAMPSHIRE': 'NH',
    'MAINE': 'ME',
    'VERMONT': 'VT',
    'RHODE ISLAND': 'RI',
    'CONNECTICUT': 'CT'
  };
  return map[upper] || upper.slice(0,2).toUpperCase();
}

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

  // Ensure no caching so users always see live, prioritized results
  try { res.setHeader('Cache-Control', 'no-store'); } catch {}

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

    const crawlResult = await generateGeographicCrawlPairs(
      {
        city: lane.origin_city,
        state: normalizeState(lane.origin_state),
        latitude: Number(originMeta.latitude),
        longitude: Number(originMeta.longitude),
        zip: originMeta.zip,
        kma_code: originMeta.kma_code
      },
      {
        city: lane.dest_city,
        state: normalizeState(lane.dest_state),
        latitude: Number(destMeta.latitude),
        longitude: Number(destMeta.longitude),
        zip: destMeta.zip,
        kma_code: destMeta.kma_code
      },
      75
    );

    const pickupBuckets = {};
    const deliveryBuckets = {};

    const pairs = Array.isArray(crawlResult?.pairs) ? crawlResult.pairs : [];

    const destStateNorm = normalizeState(lane.dest_state);
    const blockNYC = NEW_ENGLAND.has(destStateNorm);
    for (const pair of pairs) {
      buildKmaBucket(pickupBuckets, pair.origin, pair.origin?.distance);
      // If New England lane, only allow destination cities inside New England states
      if (blockNYC) {
        const destState = (pair.destination?.state || pair.destination?.state_or_province || '').toUpperCase();
        if (!NEW_ENGLAND.has(destState)) continue;
        if (NYC_LI_KMA_BLOCKLIST.has(pair.destination?.kma_code)) continue;
      }
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
