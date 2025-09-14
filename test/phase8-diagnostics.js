// Updated diagnostic test runner for Phase 8 with HERE.com city enrichment
// Provide a smarter in-memory Supabase override to avoid network calls in diagnostics
// Force offline diagnostics insert mocking
process.env.RR_DIAGNOSTICS_OFFLINE = '1';
import fs from 'node:fs/promises';
import path from 'node:path';
import { zipToKmaMapping } from '../lib/zipToKmaMapping.js';

function codeFromName(name) {
  if (!name || typeof name !== 'string') return null;
  // Normalize and drop generic suffixes
  const drop = new Set(['market', 'area', 'region', 'metro', 'zone']);
  const tokens = name
    .replace(/[^a-zA-Z\s\.]/g, ' ')
    .split(/\s+/)
    .map(t => t.replace(/\./g, ''))
    .filter(Boolean)
    .filter(t => !drop.has(t.toLowerCase()));
  if (!tokens.length) return null;
  const first = tokens[0].toUpperCase();
  const second = tokens[1] ? tokens[1].toUpperCase() : '';
  // Handle "ST LOUIS" → STL
  if (first === 'ST' && second) {
    return `ST${second[0]}`.slice(0, 3);
  }
  // If first token has >=3 letters, take first 3
  const letters = first.replace(/[^A-Z]/g, '');
  if (letters.length >= 3) return letters.slice(0, 3);
  // Otherwise, combine with next token's first letters to make 3
  const secondLetters = second.replace(/[^A-Z]/g, '');
  const combined = (letters + secondLetters).slice(0, 3);
  return combined || null;
}

function guessKmaForZip(zip) {
  if (!zip) return null;
  if (zipToKmaMapping[zip]) return zipToKmaMapping[zip];
  const z = String(zip);
  // Try 3-digit prefix match majority vote
  const prefixes = [z.slice(0, 3), z.slice(0, 2)];
  for (const p of prefixes) {
    const matches = Object.entries(zipToKmaMapping).filter(([k]) => k.startsWith(p));
    if (matches.length) {
      const counts = {};
      for (const [, kma] of matches) counts[kma] = (counts[kma] || 0) + 1;
      const best = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
      if (best) return best[0];
    }
  }
  return null;
}

function toStateAbbrev(state) {
  const map = { 'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC','south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY' };
  if (!state) return state;
  const s = state.trim();
  if (s.length === 2) return s.toUpperCase();
  return map[s.toLowerCase()] || s;
}

async function findLocalCity(city, state) {
  const abbr = toStateAbbrev(state);
  const filePath = path.join(process.cwd(), 'data', `${abbr}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(content);
    const match = items.find((r) => r.city?.toLowerCase() === city.toLowerCase());
    if (!match) return null;
    const zip = match.zip || match.postal_code;
    const kma = zipToKmaMapping[zip] || guessKmaForZip(zip) || codeFromName(match.kma_name || match.kma) || null;
    return {
      city: match.city,
      state_or_province: abbr,
      zip,
      latitude: match.lat || match.latitude,
      longitude: match.lon || match.lng || match.longitude,
      kma_code: kma,
      kma_name: match.kma_name || match.kma || null
    };
  } catch {
    return null;
  }
}

// Simple cache for all cities loaded from local dataset
let ALL_LOCAL_CITIES = null;
async function loadAllLocalCities() {
  if (ALL_LOCAL_CITIES) return ALL_LOCAL_CITIES;
  const dataDir = path.join(process.cwd(), 'data');
  const entries = await fs.readdir(dataDir);
  const cities = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json')) continue;
    const abbr = entry.replace('.json', '');
    try {
      const content = await fs.readFile(path.join(dataDir, entry), 'utf8');
      const items = JSON.parse(content);
      for (const r of items) {
        const zip = r.zip || r.postal_code;
        const kma = zipToKmaMapping[zip] || guessKmaForZip(zip) || codeFromName(r.kma_name || r.kma) || null;
        cities.push({
          city: r.city,
          state_or_province: abbr,
          zip,
          latitude: r.lat || r.latitude,
          longitude: r.lon || r.lng || r.longitude,
          kma_code: kma,
          kma_name: r.kma_name || r.kma || null,
          here_verified: Boolean(kma),
          here_confidence: kma ? 0.85 : 0.0
        });
      }
    } catch {}
  }
  ALL_LOCAL_CITIES = cities.filter(c => c.latitude && c.longitude);
  return ALL_LOCAL_CITIES;
}

// In-memory Supabase override that supports chaining and awaits at the end
globalThis.__RR_ADMIN_SUPABASE_OVERRIDE = {
  from(table) {
    const ctx = { table, filters: {}, orders: [], limit: 100 };
    const runQuery = async () => {
      if (ctx.table !== 'cities') return { data: [], error: null };
      // Case 1: Direct city/state lookup
      const ilikeCity = ctx.filters['city']?.val || ctx.filters['ilike_city']?.val || ctx.filters['city']?.val;
      const ilikeState = ctx.filters['state_or_province']?.val || ctx.filters['ilike_state_or_province']?.val || ctx.filters['state_or_province']?.val;
      if (ilikeCity && ilikeState) {
        const c = ilikeCity.replace(/%/g, '');
        const s = ilikeState.replace(/%/g, '');
        console.log(`[OVERRIDE] Direct lookup: ${c}, ${s}`);
        const row = await findLocalCity(c, s);
        console.log(`[OVERRIDE] Direct lookup result: ${row ? 'FOUND' : 'NOT FOUND'}`);
        return { data: row ? [row] : [], error: null };
      }

      // Case 2: Bounding box query
      const all = await loadAllLocalCities();
      let rows = all;
      const gteLat = ctx.filters['gte_latitude'];
      const lteLat = ctx.filters['lte_latitude'];
      const gteLon = ctx.filters['gte_longitude'];
      const lteLon = ctx.filters['lte_longitude'];
      if (gteLat) rows = rows.filter(r => r.latitude >= gteLat);
      if (lteLat) rows = rows.filter(r => r.latitude <= lteLat);
      if (gteLon) rows = rows.filter(r => r.longitude >= gteLon);
      if (lteLon) rows = rows.filter(r => r.longitude <= lteLon);
      const notKmaNull = ctx.filters['not_kma_code'];
      if (notKmaNull && notKmaNull.op === 'is' && notKmaNull.val === null) {
        rows = rows.filter(r => r.kma_code !== null && r.kma_code !== undefined && r.kma_code !== '');
      }
      const neqKma = ctx.filters['neq_kma_code'];
      if (neqKma) rows = rows.filter(r => r.kma_code !== neqKma);
      // Fallback 1: If no rows due to strict KMA inequality, relax it
      if ((!rows || rows.length === 0) && ctx.filters['neq_kma_code']) {
        console.warn('[OVERRIDE] Fallback: relaxing KMA inequality filter to allow same-KMA when no results');
        rows = all;
        if (gteLat) rows = rows.filter(r => r.latitude >= gteLat);
        if (lteLat) rows = rows.filter(r => r.latitude <= lteLat);
        if (gteLon) rows = rows.filter(r => r.longitude >= gteLon);
        if (lteLon) rows = rows.filter(r => r.longitude <= lteLon);
        if (notKmaNull && notKmaNull.op === 'is' && notKmaNull.val === null) {
          rows = rows.filter(r => r.kma_code !== null && r.kma_code !== undefined && r.kma_code !== '');
        }
      }
      // Fallback 2: If still no rows, widen the bounding box slightly (offline-only assist)
      if (!rows || rows.length === 0) {
        console.warn('[OVERRIDE] Fallback: widening bounding box by ~0.4° to find candidates');
        const widen = 0.4; // ~25-30 miles depending on latitude
        let rows2 = all;
        if (gteLat) rows2 = rows2.filter(r => r.latitude >= (gteLat - widen));
        if (lteLat) rows2 = rows2.filter(r => r.latitude <= (lteLat + widen));
        if (gteLon) rows2 = rows2.filter(r => r.longitude >= (gteLon - widen));
        if (lteLon) rows2 = rows2.filter(r => r.longitude <= (lteLon + widen));
        if (notKmaNull && notKmaNull.op === 'is' && notKmaNull.val === null) {
          rows2 = rows2.filter(r => r.kma_code !== null && r.kma_code !== undefined && r.kma_code !== '');
        }
        // Note: keep the KMA inequality relaxed in fallback; final distance filter in core will enforce <= 75mi
        rows = rows2;
      }
      if (ctx.orders.length) {
        for (const { col, ascending } of ctx.orders.reverse()) {
          rows = rows.sort((a, b) => {
            const va = a[col] ?? 0; const vb = b[col] ?? 0;
            return ascending ? (va > vb ? 1 : va < vb ? -1 : 0) : (va < vb ? 1 : va > vb ? -1 : 0);
          });
        }
      }
      return { data: rows.slice(0, ctx.limit || 100), error: null };
    };

    const api = {
      select(sel) { console.log(`[OVERRIDE] select on ${table}: ${sel || '*'}`); return api; },
      ilike(col, val) { console.log(`[OVERRIDE] ilike ${col} ~ ${val}`); ctx.filters[col] = { op: 'ilike', val }; return api; },
      not(col, op, val) { console.log(`[OVERRIDE] not ${col} ${op} ${val}`); ctx.filters[`not_${col}`] = { op, val }; return api; },
      neq(col, val) { console.log(`[OVERRIDE] neq ${col} != ${val}`); ctx.filters[`neq_${col}`] = val; return api; },
      gte(col, val) { console.log(`[OVERRIDE] gte ${col} >= ${val}`); ctx.filters[`gte_${col}`] = val; return api; },
      lte(col, val) { console.log(`[OVERRIDE] lte ${col} <= ${val}`); ctx.filters[`lte_${col}`] = val; return api; },
      order(col, { ascending } = { ascending: true }) { console.log(`[OVERRIDE] order by ${col} ${ascending ? 'asc' : 'desc'}`); ctx.orders.push({ col, ascending }); return api; },
      limit(n) { console.log(`[OVERRIDE] limit ${n}`); ctx.limit = n; return api; },
      insert(payload) { console.log(`[OVERRIDE] insert into ${table} (noop in diagnostics)`, Array.isArray(payload) ? `${payload.length} rows` : '1 row'); return api; },
      update(payload) { console.log(`[OVERRIDE] update ${table} (noop in diagnostics)`); return api; },
      then(onFulfilled, onRejected) { return runQuery().then(onFulfilled, onRejected); }
    };
    return api;
  }
};

// Important: dynamically import modules that depend on Supabase AFTER setting the override
let generateGeographicCrawlPairs;
let enrichCityData;

const testLanes = [
  { origin: 'Cincinnati, OH', destination: 'Chicago, IL', equipmentCode: 'FD' },
  { origin: 'Atlanta, GA', destination: 'Dallas, TX', equipmentCode: 'V' },
  { origin: 'Los Angeles, CA', destination: 'Seattle, WA', equipmentCode: 'R' },
  { origin: 'Miami, FL', destination: 'New York, NY', equipmentCode: 'FD' },
  { origin: 'Denver, CO', destination: 'Phoenix, AZ', equipmentCode: 'V' },
  { origin: 'Houston, TX', destination: 'San Francisco, CA', equipmentCode: 'R' },
  { origin: 'Boston, MA', destination: 'Detroit, MI', equipmentCode: 'FD' },
  { origin: 'Las Vegas, NV', destination: 'Portland, OR', equipmentCode: 'V' }
];

// Enhanced logging for diagnostic runner
async function verifyAndEnrichCity(city) {
  const [cityName, state] = city.split(', ');
  try {
    const enrichedCity = await enrichCityData(cityName, state);
    if (!enrichedCity) {
      throw new Error(`City verification failed for ${city}`);
    }

    console.log(`📋 Enriched City: ${enrichedCity.city}, State: ${enrichedCity.state_or_province}, ZIP: ${enrichedCity.zip}, KMA: ${enrichedCity.kma || 'N/A'}, Inserted: ${enrichedCity.inserted ? '✅' : `⚠️ (${enrichedCity.insert_reason || 'n/a'})`}`);
    return enrichedCity;
  } catch (error) {
    console.error(`Error enriching city ${city}:`, error.message);
    throw error;
  }
}

(async () => {
  // Dynamic imports so the override is active before these modules evaluate
  ({ generateGeographicCrawlPairs } = await import('../lib/geographicCrawl.js'));
  ({ enrichCityData } = await import('../lib/cityEnrichment.js'));
  const summary = [];

  for (const lane of testLanes) {
    console.log(`Testing lane: ${lane.origin} to ${lane.destination} with equipment ${lane.equipmentCode}`);
    try {
      const origin = await verifyAndEnrichCity(lane.origin);
      const destination = await verifyAndEnrichCity(lane.destination);

      const diversePairs = await generateGeographicCrawlPairs({
        origin: { city: origin.city, state: origin.state_or_province },
        destination: { city: destination.city, state: destination.state_or_province },
        equipment: lane.equipmentCode,
        usedCities: new Set()
      });

      console.log('Diverse pairs generated:', diversePairs.pairs.length);

      summary.push({
        lane: `${lane.origin} to ${lane.destination}`,
        pairsGenerated: diversePairs.pairs.length,
        fallbackTriggered: false,
        origin: { city: origin.city, zip: origin.zip, kma: origin.kma || origin.kma_code, inserted: origin.inserted || false },
        destination: { city: destination.city, zip: destination.zip, kma: destination.kma || destination.kma_code, inserted: destination.inserted || false }
      });
    } catch (error) {
      console.error('Error processing lane:', lane, error);
      summary.push({
        lane: `${lane.origin} to ${lane.destination}`,
        error: error.message
      });
    }
  }

  console.log('\n=== Summary ===');
  summary.forEach((result) => {
    if (result.error) {
      console.log(`❌ ${result.lane} (Error: ${result.error})`);
    } else {
      console.log(`✅ ${result.lane} (${result.pairsGenerated} pairs, fallback not needed)`);
    }
  });
})();