// lib/datcrawl.js
// KMA-aware crawl generator with strict scoring & distance rules.
// Produces up to 10 (pickup, delivery) pairs per lane as per spec.
//
// Scoring (0..1):
//  - Rate strength (snapshots/flat if available; fallback heuristic): 0.40
//  - Capacity/reload (population proxy): 0.25
//  - DAT hot region boost (cities.is_hot): 0.20
//  - Distance penalty (closer is better): 0.15
//  + Small equipment bias (reefer/flat/van hubs)
//
// Distance tiers:
//   75mi -> if short expand to 100 -> allow 125 only for strong scores (>= 0.88).
//
// KMA uniqueness by default; if preferFillTo10 is true, allow limited dup KMA with thresholds:
//   - dup KMA acceptance threshold >= 0.80
//   - at 125mi tier, threshold >= 0.88
//
// Returns: { baseOrigin, baseDest, pairs: [{pickup, delivery, score, reason: []}], shortfallReason, allowedDuplicates }

import { adminSupabase } from '../utils/supabaseClient';
import { distanceInMiles } from './haversine';

// --- Equipment family mapping for bias & rates lookup ---
const VAN_CODES = new Set(['V', 'IR', 'VR', 'FR', 'VZ']); // include variants; FR = FB/Van/Reefer mixed
const REEFER_CODES = new Set(['R', 'CR', 'IR', 'VR', 'RZ']);
const FLAT_CODES = new Set(['F', 'FD', 'SD', 'DD', 'LB', 'LA', 'FN', 'FA', 'F2', 'FZ', 'FO', 'FC', 'FS', 'FT', 'FM', 'MX', 'LR', 'LO', 'HB', 'DT', 'CN', 'C', 'CI', 'CV', 'BT', 'AC']); // broad open deck & specials

function equipmentFamily(code) {
  const c = String(code || '').toUpperCase();
  if (REEFER_CODES.has(c)) return 'reefer';
  if (FLAT_CODES.has(c)) return 'flatbed';
  return 'van';
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

// Normalize numeric (e.g., population) to 0..1 vs a soft cap.
function softNorm(value, cap) {
  if (value == null) return 0;
  const v = Math.max(0, Number(value));
  return clamp01(v / cap);
}

// --- Data access helpers ---

async function getCityByNameState(city, state) {
  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, postal_code, latitude, longitude, kma_code, kma_name, population, is_hot')
    .ilike('city', city.trim())
    .ilike('state_or_province', state.trim())
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// Query candidate cities within a lat/lon window and filter by true miles.
// We avoid PostGIS to keep this portable.
async function getCandidatesNear(base, radiusMi, limit = 400) {
  // Approx degrees for simple window (safe over-constrain)
  const latDelta = radiusMi / 69; // ~69 miles per deg latitude
  const lonDelta = radiusMi / (Math.cos((Math.PI * base.latitude) / 180) * 69 || 1);

  const minLat = base.latitude - latDelta;
  const maxLat = base.latitude + latDelta;
  const minLon = base.longitude - lonDelta;
  const maxLon = base.longitude + lonDelta;

  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, postal_code, latitude, longitude, kma_code, kma_name, population, is_hot, equipment_bias')
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLon)
    .lte('longitude', maxLon)
    .limit(limit);
  if (error) throw error;

  // Filter by true haversine distance
  return (data || []).filter((c) => {
    const d = distanceInMiles(
      { lat: base.latitude, lon: base.longitude },
      { lat: c.latitude, lon: c.longitude }
    );
    return d <= radiusMi + 1e-6; // include boundary
  });
}

// Latest rate flat lookup for state->state (if present)
async function getRateScore(originState, destState, fam /* van|reefer|flatbed */) {
  // Try latest rates_flat snapshot for the given family; source priority: avg > spot > contract
  const family = fam || 'van';
  const srcPriority = ['avg', 'spot', 'contract'];

  // Grab latest snapshot id per source for this equipment (region/state agnostic)
  const { data: snaps, error: snapErr } = await adminSupabase
    .from('rates_snapshots')
    .select('id, created_at, equipment, source, level')
    .eq('equipment', family)
    .order('created_at', { ascending: false })
    .limit(20);
  if (snapErr) throw snapErr;

  if (!snaps || !snaps.length) {
    // Fallback heuristic: neutral baseline 0.5, light bias for same-state & high-volume corridors
    return heuristicRateScore(originState, destState, family);
  }

  // Find best snapshot id by priority
  let chosen = null;
  for (const pref of srcPriority) {
    chosen = snaps.find((s) => s.source === pref && (s.level === 'state' || s.level === 'region'));
    if (chosen) break;
  }
  if (!chosen) chosen = snaps[0];

  // Look up rate in rates_flat (if denormalized)
  const { data: rateRows, error: rateErr } = await adminSupabase
    .from('rates_flat')
    .select('rate')
    .eq('snapshot_id', chosen.id)
    .eq('equipment', family)
    .eq('origin', originState)
    .eq('destination', destState)
    .limit(1);
  if (rateErr) throw rateErr;

  if (!rateRows || !rateRows.length) {
    return heuristicRateScore(originState, destState, family);
  }

  const rate = Number(rateRows[0].rate) || 0; // $/mi or normalized
  // Map a plausible 1.25 .. 3.50 $/mi to 0..1
  const minR = 1.25;
  const maxR = 3.5;
  const s = clamp01((rate - minR) / (maxR - minR));
  // Soften extremes slightly
  return 0.1 + 0.8 * s;
}

function heuristicRateScore(originState, destState, fam) {
  // Simple, deterministic bias:
  // - Same-state moves do OK (0.58)
  // - Long, cross-country typical 0.45..0.55
  // - Reefer tends slightly higher than van, flat moderate
  const same = originState === destState;
  const base = same ? 0.58 : 0.5;
  const famAdj = fam === 'reefer' ? 0.05 : fam === 'flatbed' ? 0.02 : 0;
  return clamp01(base + famAdj);
}

function equipmentBiasForCity(cityRec, fam) {
  // Optional equipment_bias text[] from DB; apply small boost if contains family tag.
  // Otherwise static rules:
  let bias = 0;
  if (Array.isArray(cityRec.equipment_bias) && cityRec.equipment_bias.length) {
    const set = new Set(cityRec.equipment_bias.map((s) => String(s).toLowerCase()));
    if (set.has(fam)) bias += 0.04;
  } else {
    // Static geo hints (very light)
    const name = `${cityRec.city}, ${cityRec.state_or_province}`.toLowerCase();
    if (fam === 'flatbed' && /port|steel|yard/.test(name)) bias += 0.02;
    if (fam === 'reefer' && /city|falls|orchard|valley/.test(name)) bias += 0.02;
  }
  return bias;
}

function scoreCity(base, cand, fam, rateStatePairScoreWeight = 0.4) {
  const reasons = [];
  const dist = distanceInMiles(
    { lat: base.latitude, lon: base.longitude },
    { lat: cand.latitude, lon: cand.longitude }
  );

  const popScore = softNorm(cand.population ?? 0, 500000); // cap around 500k
  const popW = 0.25;

  const hotScore = cand.is_hot ? 1 : 0;
  const hotW = 0.20;

  // Distance: 0..1 where 0 = far (>= tier), 1 = at base location
  // We'll map 0..125 miles roughly.
  const distNorm = clamp01(1 - dist / 125);
  const distW = 0.15;

  const equipBias = equipmentBiasForCity(cand, fam); // ~0..+0.04

  const partialScore =
    popW * popScore +
    hotW * hotScore +
    distW * distNorm +
    equipBias;

  // Final score assembled after we add rate pair piece (requires dest or origin state counterpart)
  return { reasons, dist, partialScore };
}

// Build (pickup candidates[], delivery candidates[]) with tiers and KMA uniqueness.
async function collectTieredCandidates(baseOrigin, baseDest, fam, needPerSide = 14) {
  const tiers = [75, 100, 125];
  const side = { pickups: [], deliveries: [] };
  const seenKMA = { pickups: new Set(), deliveries: new Set() };

  for (const radius of tiers) {
    // origin side
    if (side.pickups.length < needPerSide) {
      const cands = await getCandidatesNear(baseOrigin, radius, 1000);
      for (const c of cands) {
        if (!c.kma_code) continue; // require KMA to enforce uniqueness
        if (seenKMA.pickups.has(c.kma_code)) continue;
        // allow same city as base? we keep for pairing diversity but will dedupe final pair duplication
        side.pickups.push({ ...c, __radius: radius });
        seenKMA.pickups.add(c.kma_code);
        if (side.pickups.length >= needPerSide) break;
      }
    }
    // dest side
    if (side.deliveries.length < needPerSide) {
      const cands = await getCandidatesNear(baseDest, radius, 1000);
      for (const c of cands) {
        if (!c.kma_code) continue;
        if (seenKMA.deliveries.has(c.kma_code)) continue;
        side.deliveries.push({ ...c, __radius: radius });
        seenKMA.deliveries.add(c.kma_code);
        if (side.deliveries.length >= needPerSide) break;
      }
    }
  }
  return side;
}

function simpleState(str) {
  return String(str || '').trim().toUpperCase();
}

// Pairing strategy: sort pickups and deliveries by their computed total score and pair by index.
function pairTopByIndex(pickups, deliveries, maxPairs = 10) {
  const pairs = [];
  const n = Math.min(maxPairs, pickups.length, deliveries.length);
  for (let i = 0; i < n; i++) {
    pairs.push({ pickup: pickups[i], delivery: deliveries[i] });
  }
  return pairs;
}

// Deduplicate exact same (city, state) pair and enforce 125mi strength threshold
function filterPairsForRules(baseOrigin, baseDest, rawPairs, { preferFillTo10 }) {
  const uniq = new Set();
  const out = [];
  let allowedDuplicates = false;

  for (const p of rawPairs) {
    const k = `${p.pickup.city}|${p.pickup.state_or_province}|${p.delivery.city}|${p.delivery.state_or_province}`;
    if (uniq.has(k)) continue;
    // block base pair duplication
    if (
      p.pickup.city === baseOrigin.city &&
      p.pickup.state_or_province === baseOrigin.state_or_province &&
      p.delivery.city === baseDest.city &&
      p.delivery.state_or_province === baseDest.state_or_province
    ) {
      continue;
    }
    // 125-mile items must be strong
    if (p.pickup.__radius === 125 || p.delivery.__radius === 125) {
      if (p.score < 0.88) continue;
    }
    uniq.add(k);
    out.push(p);
  }

  // If short and allowed to fill, consider reusing a KMA if score >= threshold
  if (preferFillTo10 && out.length < 10) {
    allowedDuplicates = true;
    // attempt to duplicate best-scoring remaining until 10 (still no exact city pair duplicates)
    let i = 0;
    while (out.length < 10 && i < rawPairs.length) {
      const p = rawPairs[i++];
      const k = `${p.pickup.city}|${p.pickup.state_or_province}|${p.delivery.city}|${p.delivery.state_or_province}`;
      if (uniq.has(k)) continue;
      const threshold = (p.pickup.__radius === 125 || p.delivery.__radius === 125) ? 0.88 : 0.80;
      if (p.score >= threshold) {
        uniq.add(k);
        out.push(p);
      }
    }
  }

  return { pairs: out.slice(0, 10), allowedDuplicates };
}

export async function generateCrawlPairs({ origin, destination, equipment, preferFillTo10 = false }) {
  // origin/destination must be objects with { city, state } at minimum.
  if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
    throw new Error('generateCrawlPairs: origin/destination require city+state');
  }

  const fam = equipmentFamily(equipment);

  const baseOrigin = await getCityByNameState(origin.city, origin.state);
  const baseDest = await getCityByNameState(destination.city, destination.state);
  if (!baseOrigin || !baseDest) {
    throw new Error('Origin or Destination city not found in `cities` table');
  }

  // Collect candidates
  const needPerSide = 18; // gather more than 10 for filtering
  const { pickups, deliveries } = await collectTieredCandidates(baseOrigin, baseDest, fam, needPerSide);

  // Score each side with partial + rate contribution for state pair
  // For pickup scoring, we include rate score with the final dest state; vice versa for delivery scoring with origin state.
  // Then combined pair score is mean of pickup & delivery totals.

  // Precompute rate score for the state pair
  const originState = simpleState(baseOrigin.state_or_province);
  const destState = simpleState(baseDest.state_or_province);
  const ratePairScore = await getRateScore(originState, destState, fam); // 0..1

  const pickupsScored = pickups.map((c) => {
    const { partialScore, dist } = scoreCity(baseOrigin, c, fam);
    const total = clamp01(0.40 * ratePairScore + partialScore); // 0.40 already inside
    return { ...c, __score: total, __dist: dist };
  });

  const deliveriesScored = deliveries.map((c) => {
    const { partialScore, dist } = scoreCity(baseDest, c, fam);
    const total = clamp01(0.40 * ratePairScore + partialScore);
    return { ...c, __score: total, __dist: dist };
  });

  // Sort each side by score desc, tie-breaker by distance asc
  pickupsScored.sort((a, b) => (b.__score - a.__score) || (a.__dist - b.__dist));
  deliveriesScored.sort((a, b) => (b.__score - a.__score) || (a.__dist - b.__dist));

  // Pair by index
  const rawPairs = pairTopByIndex(pickupsScored, deliveriesScored, 12).map(({ pickup, delivery }) => {
    // combined pair score as mean
    const score = clamp01((pickup.__score + delivery.__score) / 2);
    const reason = [];
    if (pickup.is_hot) reason.push('pickup_hot');
    if (delivery.is_hot) reason.push('delivery_hot');
    if (pickup.__radius <= 75) reason.push('pickup_close');
    if (delivery.__radius <= 75) reason.push('delivery_close');
    if (score >= 0.88) reason.push('high_score');
    return { pickup, delivery, score, reason };
  });

  const { pairs, allowedDuplicates } = filterPairsForRules(baseOrigin, baseDest, rawPairs, { preferFillTo10 });

  let shortfallReason = null;
  if (pairs.length < 10) {
    // Identify principal limitation
    const uniquePickupKMAs = new Set(rawPairs.map((p) => p.pickup.kma_code)).size;
    const uniqueDeliveryKMAs = new Set(rawPairs.map((p) => p.delivery.kma_code)).size;
    shortfallReason = 'insufficient_unique_kma_or_low_scores';
    if (uniquePickupKMAs < 10 || uniqueDeliveryKMAs < 10) {
      shortfallReason = 'insufficient_unique_kma';
    } else if (rawPairs.every((p) => p.score < 0.80)) {
      shortfallReason = 'low_scores';
    }
  }

  // Format minimal city objects for CSV builder
  function toSlim(c) {
    return {
      id: c.id,
      city: c.city,
      state: c.state_or_province,
      zip: c.zip || c.postal_code || null,
      kma_code: c.kma_code,
      kma_name: c.kma_name,
      latitude: c.latitude,
      longitude: c.longitude,
    };
  }

  return {
    baseOrigin: toSlim(baseOrigin),
    baseDest: toSlim(baseDest),
    pairs: pairs.map((p) => ({
      pickup: toSlim(p.pickup),
      delivery: toSlim(p.delivery),
      score: p.score,
      reason: p.reason,
    })),
    count: pairs.length,
    shortfallReason,
    allowedDuplicates,
  };
}
