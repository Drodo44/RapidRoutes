// lib/datcrawl.js
import { adminSupabase } from '../utils/supabaseClient';
import { distanceInMiles } from './haversine';

// Scoring weights
const W_RATE = 0.40;
const W_CAP  = 0.25;
const W_HOT  = 0.20;
const W_DIST = 0.15;

const TIERS = [75, 100, 125];

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function distScore(miles){
  // 0 @125mi, 1 @0mi (piecewise linear)
  return clamp01(1 - (miles / 125));
}

function eqBias(equip, cityRow){
  const eq = String(equip || '').toUpperCase();
  // Tiny, safe nudges – deterministic
  if (!cityRow) return 0;
  const name = `${cityRow.city} ${cityRow.kma_name || ''}`.toLowerCase();
  if (eq === 'R' || eq === 'IR') {
    if (/(fresno|yakima|salinas|yuma|imperial|modesto|mcallen|laredo|miami|tampa)/.test(name)) return 0.05;
  }
  if (eq === 'FD' || eq === 'F' || eq === 'SD' || eq === 'DD' || eq === 'RGN' || eq === 'LB') {
    if (/(pittsburgh|detroit|toledo|birmingham|gary|houston|beaumont|mobile|savannah|charleston|tacoma|norfolk)/.test(name)) return 0.05;
  }
  if (eq === 'V') {
    if (/(dallas|atlanta|chicago|columbus|memphis|indy|harrisburg|allentown|phoenix)/.test(name)) return 0.03;
  }
  return 0;
}

async function getCityExact(city, state){
  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name, population, is_hot')
    .ilike('city', city)
    .ilike('state_or_province', state)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function getNearbyCandidates(base, miles){
  // Load a bounded set (server-side we cannot geofilter; fetch a slice and filter in memory)
  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name, population, is_hot')
    .limit(4000); // safe cap; filtered below
  if (error) throw error;

  const out = [];
  for (const c of data || []) {
    if (c.latitude == null || c.longitude == null) continue;
    const d = distanceInMiles(
      { lat: base.latitude, lon: base.longitude },
      { lat: c.latitude,  lon: c.longitude }
    );
    if (d <= miles && !(c.city === base.city && c.state_or_province === base.state_or_province)) {
      out.push({ ...c, _miles: d });
    }
  }
  // Most useful first
  out.sort((a,b) => a._miles - b._miles);
  return out;
}

function scoreCity(c, equip, rateStrength=0.5){
  const sRate = clamp01(rateStrength);
  const sCap  = clamp01((c.population || 0) / 1000000); // 1.0 at 1M pop+
  const sHot  = c.is_hot ? 1 : 0;
  const sDist = distScore(c._miles || 0);
  const bias  = eqBias(equip, c);
  const base  = W_RATE*sRate + W_CAP*sCap + W_HOT*sHot + W_DIST*sDist + bias;
  return clamp01(base);
}

async function pickSideCandidates(baseCity, equip){
  // Expand 75 -> 100 -> 125 miles
  for (const r of TIERS) {
    const list = await getNearbyCandidates(baseCity, r);
    if (list.length >= 12 || r === 125) {
      // Dedup KMA, keep top by score
      const byKMA = new Map();
      for (const c of list) {
        // Without snapshots, proxy rateStrength ~ 0.5; if you have rates_flat, you can wire real lookups.
        const sc = scoreCity(c, equip, 0.5);
        if (r === 125 && sc < 0.88) continue; // strict for 125 tier
        const prev = byKMA.get(c.kma_code);
        if (!prev || sc > prev._score) byKMA.set(c.kma_code, { ...c, _score: sc });
      }
      // Return sorted by score desc
      return Array.from(byKMA.values()).sort((a,b) => b._score - a._score);
    }
  }
  return [];
}

export async function generateCrawlPairs({ origin, destination, equipment, preferFillTo10 }) {
  const baseOrigin = await getCityExact(origin.city, origin.state);
  const baseDest   = await getCityExact(destination.city, destination.state);
  if (!baseOrigin || !baseDest) {
    throw new Error('Origin or destination not found in cities table');
  }

  const picksO = await pickSideCandidates(baseOrigin, equipment);
  const picksD = await pickSideCandidates(baseDest,   equipment);

  const pairs = [];
  const usedPairs = new Set();
  const n = Math.min(10, Math.min(picksO.length, picksD.length));

  for (let i = 0; i < n; i++) {
    const p = picksO[i], d = picksD[i];
    const key = `${p.id}-${d.id}`;
    if (usedPairs.has(key)) continue;
    usedPairs.add(key);
    pairs.push({
      pickup:   { city: p.city, state: p.state_or_province, zip: p.zip || '', kma_code: p.kma_code },
      delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '', kma_code: d.kma_code },
      score: clamp01((p._score + d._score)/2),
      reason: []
    });
  }

  let shortfallReason = null;
  if (pairs.length < 10) {
    shortfallReason = 'insufficient_unique_kma_or_low_scores';
    if (!preferFillTo10) {
      // leave as-is (strict); caller may opt to fill later
    } else {
      // try to fill by reusing KMAs if scores >= 0.80
      const poolP = picksO.filter(c => c._score >= 0.80);
      const poolD = picksD.filter(c => c._score >= 0.80);
      let idx = 0;
      while (pairs.length < 10 && idx < 50 && poolP[idx%poolP.length] && poolD[idx%poolD.length]) {
        const p = poolP[idx%poolP.length], d = poolD[idx%poolD.length];
        const key = `${p.id}-${d.id}`;
        if (!usedPairs.has(key)) {
          usedPairs.add(key);
          pairs.push({
            pickup:   { city: p.city, state: p.state_or_province, zip: p.zip || '', kma_code: p.kma_code },
            delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '', kma_code: d.kma_code },
            score: clamp01((p._score + d._score)/2),
            reason: ['duplicate_kma_allowed']
          });
        }
        idx++;
      }
    }
  }

  return {
    baseOrigin: { city: baseOrigin.city, state: baseOrigin.state_or_province, zip: baseOrigin.zip || '' },
    baseDest:   { city: baseDest.city,   state: baseDest.state_or_province,   zip: baseDest.zip || '' },
    pairs,
    count: pairs.length,
    shortfallReason,
    allowedDuplicates: preferFillTo10
  };
}
