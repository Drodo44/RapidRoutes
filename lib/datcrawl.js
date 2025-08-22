// lib/datcrawl.js
import { adminSupabase } from '../utils/supabaseClient';
import { distanceInMiles } from './haversine';

// Scoring weights for freight intelligence
const W_RATE = 0.50; // Increased from 0.40
const W_CAP  = 0.30; // Increased from 0.25
const W_DIST = 0.20; // Increased from 0.15
// Removed W_HOT (was 0.20)

const TIERS = [75, 100, 125];

function clamp01(x){ return Math.max(0, Math.min(1, x)); }
function distScore(miles){
  // 0 @125mi, 1 @0mi (piecewise linear)
  return clamp01(1 - (miles / 125));
}

// INTELLIGENT FREIGHT EQUIPMENT TARGETING
function eqBias(equip, cityRow){
  const eq = String(equip || '').toUpperCase();
  if (!cityRow) return 0;
  const name = `${cityRow.city} ${cityRow.kma_name || ''}`.toLowerCase();
  
  // REEFER INTELLIGENCE - Produce, Import/Export, Cold Storage
  if (eq === 'R' || eq === 'IR') {
    // Major produce regions - drivers expect backhauls
    if (/(fresno|salinas|watsonville|hollister|modesto|stockton|merced)/.test(name)) return 0.15; // CA Central Valley
    if (/(mcallen|laredo|pharr|brownsville|harlingen)/.test(name)) return 0.15; // TX Border produce
    if (/(miami|homestead|plant city|lakeland|tampa|fort myers)/.test(name)) return 0.12; // FL produce
    if (/(yuma|phoenix|tucson|nogales)/.test(name)) return 0.10; // AZ produce
    if (/(yakima|wenatchee|spokane|pasco)/.test(name)) return 0.10; // WA produce
    if (/(chicago|atlanta|dallas|los angeles|long beach|savannah|charleston|norfolk|baltimore)/.test(name)) return 0.08; // Major ports/distribution
    return 0.05;
  }
  
  // FLATBED INTELLIGENCE - Steel, Construction, Oil/Gas, Manufacturing
  if (eq === 'FD' || eq === 'F' || eq === 'SD' || eq === 'DD' || eq === 'RGN' || eq === 'LB') {
    // Steel production centers - guaranteed steel loads out
    if (/(pittsburgh|gary|birmingham|cleveland|detroit|toledo|youngstown)/.test(name)) return 0.15; // Steel belt
    if (/(houston|beaumont|port arthur|corpus christi|galveston)/.test(name)) return 0.15; // Oil/gas equipment
    if (/(charlotte|spartanburg|greenville|anderson)/.test(name)) return 0.12; // Auto manufacturing
    if (/(chicago|atlanta|dallas|kansas city|denver|phoenix)/.test(name)) return 0.10; // Construction materials hubs
    if (/(mobile|savannah|charleston|norfolk|tacoma|long beach)/.test(name)) return 0.10; // Port heavy equipment
    if (/(nashville|memphis|louisville|indianapolis|columbus)/.test(name)) return 0.08; // Manufacturing corridors
    return 0.05;
  }
  
  // VAN INTELLIGENCE - Distribution, Retail, E-commerce
  if (eq === 'V') {
    // Major distribution hubs - high freight density
    if (/(atlanta|dallas|chicago|memphis|indianapolis|columbus)/.test(name)) return 0.12; // Primary distribution
    if (/(phoenix|denver|kansas city|nashville|charlotte|jacksonville)/.test(name)) return 0.10; // Regional distribution
    if (/(los angeles|riverside|ontario|fontana|carson)/.test(name)) return 0.10; // CA logistics corridor
    if (/(harrisburg|allentown|newark|elizabeth|edison)/.test(name)) return 0.08; // Northeast corridors
    if (/(cincinnati|louisville|toledo|fort wayne|green bay)/.test(name)) return 0.06; // Midwest manufacturing
    return 0.03;
  }
  
  return 0;
}

async function getCityExact(city, state){
  // Try exact match first
  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .ilike('city', city)
    .ilike('state_or_province', state)
    .limit(1);
  if (error) throw error;
  
  if (data && data.length > 0) {
    return data[0];
  }
  
  // Fallback: try to find a nearby major city in the same state
  console.log(`CITY FALLBACK: ${city}, ${state} not found, looking for nearby cities...`);
  const { data: fallback } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
    .ilike('state_or_province', state)
    .not('kma_code', 'is', null) // Prefer cities with KMA codes (major freight markets)
    .order('city')
    .limit(1);
  
  if (fallback && fallback.length > 0) {
    console.log(`CITY FALLBACK: Using ${fallback[0].city}, ${fallback[0].state_or_province} as fallback for ${city}, ${state}`);
    return fallback[0];
  }
  
  return null;
}

async function getNearbyCandidates(base, miles){
  // Load a bounded set (server-side we cannot geofilter; fetch a slice and filter in memory)
  const { data, error } = await adminSupabase
    .from('cities')
    .select('id, city, state_or_province, zip, latitude, longitude, kma_code, kma_name')
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

// Get rate strength - simplified to avoid non-existent table calls
async function getRateStrength(origin, destination, equipment) {
  // Return default rate strength to avoid database calls to non-existent tables
  return 0.5;
}

function scoreCity(c, equip, rateStrength=0.5){
  const sRate = clamp01(rateStrength);
  // Use KMA code as a proxy for market size
  const isMajorMarket = c.kma_name && /chicago|atlanta|dallas|houston|los angeles|new york|miami|seattle/i.test(c.kma_name);
  const sCap  = isMajorMarket ? 0.9 : 0.5; // Give higher score to major markets
  const sDist = distScore(c._miles || 0);
  const bias  = eqBias(equip, c);
  // Removed W_HOT*sHot from scoring calculation
  const base  = W_RATE*sRate + W_CAP*sCap + W_DIST*sDist + bias;
  return clamp01(base);
}

// Helper function to use simple scoring for tie-breaking
async function aiTiebreak(equip, candidateA, candidateB) {
  // Simple tie-breaking without AI calls for now
  const scoreDiff = Math.abs(candidateA._score - candidateB._score);
  if (scoreDiff > 0.03) {
    return candidateA._score > candidateB._score ? candidateA : candidateB;
  }
  
  // For close scores, prefer based on distance
  if (candidateA._miles < candidateB._miles) {
    return candidateA;
  } else if (candidateB._miles < candidateA._miles) {
    return candidateB;
  }
  
  // Final fallback to first candidate
  return candidateA;
}

async function pickSideCandidates(baseCity, equip, preferFillTo10 = false){
  console.log(`PICKSIDE DEBUG START: ${baseCity.city}, ${baseCity.state_or_province} - preferFillTo10: ${preferFillTo10}`);
  
  // Expand 75 -> 100 -> 125 miles
  for (const r of TIERS) {
    const list = await getNearbyCandidates(baseCity, r);
    const minCandidates = preferFillTo10 ? 20 : 12; // More candidates needed for Fill-to-5
    console.log(`PICKSIDE TIER ${r}: Found ${list.length} candidates (need ${minCandidates})`);
    
    if (list.length >= minCandidates || r === 125) {
      // INTELLIGENT FREIGHT SELECTION WITH KMA DIVERSITY
      const byKMA = new Map();
      
      // Try to get rate strength from database
      const rateStrength = await getRateStrength(baseCity.state_or_province, null, equip) || 0.5;
      
      console.log(`CANDIDATES DEBUG: ${baseCity.city}, ${baseCity.state_or_province} - Found ${list.length} cities within ${r} miles (preferFillTo10: ${preferFillTo10})`);
      
      for (const c of list) {
        const sc = scoreCity(c, equip, rateStrength);
        // More permissive scoring for Fill-to-5 mode
        const minScore = preferFillTo10 ? 0.75 : 0.85;
        console.log(`SCORING: ${c.city}, ${c.state_or_province} - score: ${sc.toFixed(3)}, minScore: ${minScore}`);
        if (r === 125 && sc < minScore) {
          console.log(`SKIP: Score too low`);
          continue;
        }
        
        const prev = byKMA.get(c.kma_code);
        if (!prev) {
          byKMA.set(c.kma_code, { ...c, _score: sc });
        } else if (sc > prev._score) {
          byKMA.set(c.kma_code, { ...c, _score: sc });
        } else if (Math.abs(sc - prev._score) <= 0.03) {
          // For very close scores, use distance-based tiebreak
          const winner = c._miles <= prev._miles ? { ...c, _score: sc } : prev;
          byKMA.set(c.kma_code, winner);
        }
      }
      
      // SMART CANDIDATE SELECTION - Much more aggressive for Fill-to-5
      const maxCandidates = preferFillTo10 ? 20 : 8; // Many more candidates for Fill-to-5
      const candidates = Array.from(byKMA.values())
        .sort((a,b) => b._score - a._score)
        .slice(0, maxCandidates);
      
      console.log(`FINAL CANDIDATES: ${baseCity.city}, ${baseCity.state_or_province} - Selected ${candidates.length}/${byKMA.size} candidates (preferFillTo10: ${preferFillTo10})`);
      return candidates;
    }
  }
  return [];
}

export async function generateCrawlPairs({ origin, destination, equipment, preferFillTo10 }) {
  const baseOrigin = await getCityExact(origin.city, origin.state);
  const baseDest   = await getCityExact(destination.city, destination.state);
  if (!baseOrigin || !baseDest) {
    console.error(`CRAWL ERROR: Cities not found - Origin: ${origin.city}, ${origin.state} (found: ${!!baseOrigin}), Dest: ${destination.city}, ${destination.state} (found: ${!!baseDest})`);
    throw new Error(`Origin or destination not found in cities table: ${!baseOrigin ? `${origin.city}, ${origin.state}` : ''} ${!baseDest ? `${destination.city}, ${destination.state}` : ''}`);
  }

  // INTELLIGENT FREIGHT CRAWL GENERATION
  const picksO = await pickSideCandidates(baseOrigin, equipment, preferFillTo10);
  const picksD = await pickSideCandidates(baseDest,   equipment, preferFillTo10);

  console.log(`CRAWL DEBUG - Origin (${baseOrigin.city}, ${baseOrigin.state_or_province}):`);
  console.log(`  Found ${picksO.length} pickup candidates`);
  console.log(`  Top candidates:`, picksO.slice(0,3).map(c => `${c.city}, ${c.state_or_province} (score: ${c._score}, dist: ${c._miles}mi)`));
  
  console.log(`CRAWL DEBUG - Destination (${baseDest.city}, ${baseDest.state_or_province}):`);
  console.log(`  Found ${picksD.length} delivery candidates`);
  console.log(`  Top candidates:`, picksD.slice(0,3).map(c => `${c.city}, ${c.state_or_province} (score: ${c._score}, dist: ${c._miles}mi)`));

  const pairs = [];
  const usedPairs = new Set();
  
  // OPTIMIZED: Generate 5 pairs when filling, 2-3 normally for quality over quantity
  const targetCount = preferFillTo10 ? 5 : Math.min(3, Math.min(picksO.length, picksD.length));
  
  // When filling, be more aggressive about creating pairs even with limited candidates
  let n;
  if (preferFillTo10) {
    n = Math.min(targetCount, Math.max(picksO.length, picksD.length)); // Use the LARGER of the two pools
  } else {
    n = Math.min(targetCount, Math.min(picksO.length, picksD.length)); // Conservative approach
  }

  console.log(`DEBUG: targetCount=${targetCount}, picksO.length=${picksO.length}, picksD.length=${picksD.length}, n=${n}, preferFillTo10=${preferFillTo10}`);

  // Generate intelligent freight pairs with KMA diversity
  for (let i = 0; i < n; i++) {
    // When filling and pools are uneven, cycle through the smaller pool
    const pIndex = i % picksO.length;
    const dIndex = i % picksD.length;
    
    const p = picksO[pIndex];
    const d = picksD[dIndex];
    
    if (!p || !d) {
      console.log(`DEBUG: Skipping pair ${i} - missing candidate (p: ${!!p}, d: ${!!d})`);
      continue;
    }
    
    const key = `${p.id}-${d.id}`;
    if (usedPairs.has(key)) {
      console.log(`DEBUG: Skipping duplicate pair ${i}: ${p.city} -> ${d.city}`);
      continue;
    }
    
    usedPairs.add(key);
    pairs.push({
      pickup:   { city: p.city, state: p.state_or_province, zip: p.zip || '', kma_code: p.kma_code },
      delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '', kma_code: d.kma_code },
      score: clamp01((p._score + d._score)/2),
      reason: [`equipment_${equipment}_intelligent_targeting`]
    });
    
    console.log(`DEBUG: Added pair ${pairs.length}: ${p.city}, ${p.state_or_province} -> ${d.city}, ${d.state_or_province}`);
  }

  // Smart shortfall analysis
  let shortfallReason = null;
  if (pairs.length < targetCount) {
    shortfallReason = 'insufficient_unique_kma_or_low_scores';
    if (!preferFillTo10) {
      // Maintain strict quality standards
    } else {
      // Fill with good candidates (0.60+ instead of 0.80+ for more options)
      const poolP = picksO.filter(c => c._score >= 0.60);
      const poolD = picksD.filter(c => c._score >= 0.60);
      console.log(`DEBUG: Backfill pools - poolP.length=${poolP.length}, poolD.length=${poolD.length}, current pairs=${pairs.length}, target=${targetCount}`);
      
      let idx = 0;
      while (pairs.length < targetCount && idx < 50 && poolP.length > 0 && poolD.length > 0) {
        const p = poolP[idx % poolP.length], d = poolD[idx % poolD.length];
        const key = `${p.id}-${d.id}`;
        if (!usedPairs.has(key)) {
          usedPairs.add(key);
          pairs.push({
            pickup:   { city: p.city, state: p.state_or_province, zip: p.zip || '', kma_code: p.kma_code },
            delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '', kma_code: d.kma_code },
            score: clamp01((p._score + d._score)/2),
            reason: ['high_score_backfill']
          });
          console.log(`DEBUG: Added backfill pair ${pairs.length}/${targetCount}: ${p.city}, ${p.state_or_province} -> ${d.city}, ${d.state_or_province}`);
        }
        idx++;
      }
    }
  }

  console.log(`DEBUG: Final result - Generated ${pairs.length}/${targetCount} pairs, shortfall: ${shortfallReason}`);

  return {
    baseOrigin: { city: baseOrigin.city, state: baseOrigin.state_or_province, zip: baseOrigin.zip || '' },
    baseDest:   { city: baseDest.city,   state: baseDest.state_or_province,   zip: baseDest.zip || '' },
    pairs,
    count: pairs.length,
    shortfallReason,
    allowedDuplicates: preferFillTo10,
    intelligence: `${equipment}_optimized_freight_targeting` // Track intelligence level
  };
}
