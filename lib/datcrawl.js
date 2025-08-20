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

// Get rate strength from database if available
async function getRateStrength(origin, destination, equipment) {
  try {
    // Try to get latest rate snapshot for this lane
    const { data: snapshot } = await adminSupabase
      .from('rates_snapshots')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (!snapshot?.id) return 0.5; // Default rate strength
    
    // Get rate for this lane
    const { data: rate } = await adminSupabase
      .from('rates_flat')
      .select('rate')
      .eq('snapshot_id', snapshot.id)
      .eq('origin', origin)
      .eq('destination', destination)
      .eq('equipment', equipment)
      .maybeSingle();
      
    if (!rate) return 0.5;
    
    // Normalize rate to 0-1 score (example implementation)
    // In production, you'd want a smarter normalization based on your rate ranges
    const normalized = Math.min(Math.max(rate.rate / 5.0, 0), 1);
    return normalized;
  } catch (e) {
    console.warn('Failed to get rate strength:', e);
    return 0.5; // Default
  }
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

// Helper function to use AI for close tie-breaking
async function aiTiebreak(equip, candidateA, candidateB) {
  try {
    // Only use AI tiebreak when scores are very close
    const scoreDiff = Math.abs(candidateA._score - candidateB._score);
    if (scoreDiff > 0.03) {
      return candidateA._score > candidateB._score ? candidateA : candidateB;
    }
    
    // Call the AI tiebreak API
    const apiUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/ai/crawl-tiebreak` 
      : '/api/ai/crawl-tiebreak';
      
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment: equip,
        candidateA: {
          kma: candidateA.kma_code,
          city: candidateA.city,
          score: candidateA._score
        },
        candidateB: {
          kma: candidateB.kma_code,
          city: candidateB.city,
          score: candidateB._score
        }
      }),
      // Short timeout to avoid blocking the crawl process
      signal: AbortSignal.timeout(1500) // Slightly longer timeout
    });
    
    if (!response.ok) {
      throw new Error('AI tiebreak failed');
    }
    
    const result = await response.json();
    
    if (result.winner === 'A') {
      // Apply AI bonus to score
      return { 
        ...candidateA, 
        _score: Math.min(1, candidateA._score + (result.score_delta || 0)),
        _aiBoost: true
      };
    } else {
      return { 
        ...candidateB, 
        _score: Math.min(1, candidateB._score + (result.score_delta || 0)),
        _aiBoost: true
      };
    }
  } catch (e) {
    // On any error, fall back to deterministic comparison
    return candidateA._score >= candidateB._score ? candidateA : candidateB;
  }
}

async function pickSideCandidates(baseCity, equip){
  // Expand 75 -> 100 -> 125 miles
  for (const r of TIERS) {
    const list = await getNearbyCandidates(baseCity, r);
    if (list.length >= 12 || r === 125) {
      // Dedup KMA, keep top by score
      const byKMA = new Map();
      
      // Try to get rate strength from database
      const rateStrength = await getRateStrength(baseCity.state_or_province, null, equip) || 0.5;
      
      for (const c of list) {
        const sc = scoreCity(c, equip, rateStrength);
        if (r === 125 && sc < 0.88) continue; // strict for 125 tier
        
        const prev = byKMA.get(c.kma_code);
        if (!prev) {
          byKMA.set(c.kma_code, { ...c, _score: sc });
        } else if (sc > prev._score) {
          byKMA.set(c.kma_code, { ...c, _score: sc });
        } else if (Math.abs(sc - prev._score) <= 0.03) {
          // For very close scores, use AI tiebreak
          try {
            const winner = await aiTiebreak(equip, { ...c, _score: sc }, prev);
            byKMA.set(c.kma_code, winner);
          } catch (e) {
            // On failure, keep the higher score
            if (sc > prev._score) byKMA.set(c.kma_code, { ...c, _score: sc });
          }
        }
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
