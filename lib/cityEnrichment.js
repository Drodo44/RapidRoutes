/**
 * Enhanced city enrichment system using HERE.com and KMA data
 */

import { adminSupabase } from '../utils/supabaseClient.js';
import { calculateDistance } from './distanceCalculator.js';
import { verifyCityWithHERE } from './hereVerificationService.js';
import { zipToKmaMapping } from './zipToKmaMapping.js';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Enhanced ZIP → KMA mapping with fallback handling
 */
function getKmaForZip(zip) {
  if (!zip) {
    console.warn('⚠️ Missing ZIP code for KMA lookup');
    return null;
  }

  const kma = zipToKmaMapping[zip];
  if (!kma) {
    console.warn(`⚠️ No KMA found for ZIP: ${zip}`);
  }

  return kma;
}

// Derive a concise KMA code from a human-readable KMA name like "Chicago Market" → "CHI"
function codeFromName(name) {
  if (!name || typeof name !== 'string') return null;
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
  if (first === 'ST' && second) {
    return `ST${second[0]}`.slice(0, 3);
  }
  const letters = first.replace(/[^A-Z]/g, '');
  if (letters.length >= 3) return letters.slice(0, 3);
  const secondLetters = second.replace(/[^A-Z]/g, '');
  const combined = (letters + secondLetters).slice(0, 3);
  return combined || null;
}

// Resolve Supabase REST base URL (server or next public)
function getSupabaseRestUrl() {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  if (typeof url === 'string' && url.includes('${')) {
    url = 'http://localhost:54321';
  }
  try { new URL(url); } catch { url = 'http://localhost:54321'; }
  return url;
}

// Check if a city already exists (avoid duplicates without relying on DB constraints)
async function cityExists(cityData) {
  if (process.env.RR_DIAGNOSTICS_OFFLINE === '1') {
    // In offline diagnostics mode, don't block inserts on existence
    return false;
  }
  const supabaseUrl = getSupabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const query = `${supabaseUrl}/rest/v1/cities?select=id&city=eq.${encodeURIComponent(cityData.city)}&state_or_province=eq.${encodeURIComponent(cityData.state_or_province)}&zip=eq.${encodeURIComponent(cityData.zip)}&limit=1`;
    const resp = await fetch(query, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.warn(`⚠️ Existence check failed (${resp.status}): ${txt}`);
      return false; // don't block insert on check failure
    }
    const rows = await resp.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch (err) {
    console.warn('⚠️ Existence check error:', err.message);
    return false;
  }
}

// Direct POST to Supabase with service role key (with duplicate check)
async function insertCityIntoSupabase(cityData) {
  if (process.env.RR_DIAGNOSTICS_OFFLINE === '1') {
    console.log(`📝 [OFFLINE] Mock-inserting city: ${cityData.city}, ${cityData.state_or_province} (ZIP: ${cityData.zip}, KMA: ${cityData.kma_code || 'N/A'})`);
    return { inserted: true, reason: 'offline-mock' };
  }
  const supabaseUrl = getSupabaseRestUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Supabase URL or Service Role Key is missing');
    return { inserted: false, reason: 'missing-config' };
  }

  // Check for existing row
  const exists = await cityExists(cityData);
  if (exists) {
    console.log(`↩️ City already exists, skipping insert: ${cityData.city}, ${cityData.state_or_province} (${cityData.zip})`);
    return { inserted: false, reason: 'duplicate' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/cities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify(cityData)
    });

    if (!response.ok) {
      let payload;
      try { payload = await response.json(); } catch { payload = await response.text(); }
      console.error('❌ Failed to insert city into Supabase:', payload);
      return { inserted: false, reason: `http-${response.status}` };
    }

    console.log(`✅ City inserted into Supabase: ${cityData.city}, ${cityData.state_or_province} (ZIP: ${cityData.zip}, KMA: ${cityData.kma_code || 'N/A'})`);
    return { inserted: true };
  } catch (error) {
    console.error('❌ Supabase direct POST error:', error.message);
    return { inserted: false, reason: 'network-error' };
  }
}

// Enhanced logging for diagnostics
function logEnrichmentResult(cityData, inserted, reason = '') {
  const status = inserted ? 'Inserted ✅' : `Skipped ⚠️${reason ? ` (${reason})` : ''}`;
  console.log(`📋 Enrichment Result: ${status} | City: ${cityData.city}, State: ${cityData.state_or_province}, ZIP: ${cityData.zip}, KMA: ${cityData.kma_code || 'N/A'}`);
}

// Map full state name to abbreviation; if already abbreviation, return as-is
function toStateAbbrev(state) {
  const map = {
    'alabama': 'AL','alaska': 'AK','arizona': 'AZ','arkansas': 'AR','california': 'CA','colorado': 'CO','connecticut': 'CT','delaware': 'DE','florida': 'FL','georgia': 'GA','hawaii': 'HI','idaho': 'ID','illinois': 'IL','indiana': 'IN','iowa': 'IA','kansas': 'KS','kentucky': 'KY','louisiana': 'LA','maine': 'ME','maryland': 'MD','massachusetts': 'MA','michigan': 'MI','minnesota': 'MN','mississippi': 'MS','missouri': 'MO','montana': 'MT','nebraska': 'NE','nevada': 'NV','new hampshire': 'NH','new jersey': 'NJ','new mexico': 'NM','new york': 'NY','north carolina': 'NC','north dakota': 'ND','ohio': 'OH','oklahoma': 'OK','oregon': 'OR','pennsylvania': 'PA','rhode island': 'RI','south carolina': 'SC','south dakota': 'SD','tennessee': 'TN','texas': 'TX','utah': 'UT','vermont': 'VT','virginia': 'VA','washington': 'WA','west virginia': 'WV','wisconsin': 'WI','wyoming': 'WY'
  };
  if (!state) return state;
  const s = state.trim();
  if (s.length === 2) return s.toUpperCase();
  return map[s.toLowerCase()] || s;
}

// Try to find city details from local dataset at data/STATE.json
async function localCityLookup(city, state) {
  try {
    const abbr = toStateAbbrev(state);
    const filePath = path.join(process.cwd(), 'data', `${abbr}.json`);
    const content = await fs.readFile(filePath, 'utf8');
    const items = JSON.parse(content);
    const match = items.find((r) => r.city?.toLowerCase() === city.toLowerCase());
    if (match) {
      const zip = match.zip || match.postal_code;
      const kma = getKmaForZip(zip) || codeFromName(match.kma_name || match.kma);
      return {
        city: match.city || city,
        state_or_province: abbr,
        zip,
        kma_code: kma || null,
        latitude: match.lat || match.latitude,
        longitude: match.lon || match.lng || match.longitude,
        // convenience field for diagnostics
        kma: kma || null,
        source: 'local-dataset'
      };
    }
  } catch (err) {
    console.warn('⚠️ Local dataset lookup failed:', err.message);
  }
  return null;
}

/**
 * Enrich city data with HERE.com and assign KMA
 */
export async function enrichCityData(city, state) {
  console.log(`🔍 Enriching city data: ${city}, ${state}`);

  // Step 1: Verify with HERE.com
  let cityData = null;
  let verification = null;
  try {
    verification = await verifyCityWithHERE(city, state);
  } catch (e) {
    console.warn('⚠️ HERE verification error:', e.message);
  }

  if (verification?.verified && verification.data?.address && verification.data?.position) {
    const hereData = verification.data;
    const zip = hereData.address.postalCode;
    const kma = getKmaForZip(zip);
    cityData = {
      city,
      state_or_province: toStateAbbrev(state),
      zip,
      kma_code: kma || null,
      latitude: hereData.position.lat,
      longitude: hereData.position.lng,
      // convenience field for diagnostics
      kma: kma || null,
      source: 'here'
    };

    // Fallback: If ZIP→KMA mapping failed, try nearest known city (<= 10 miles), prefer same state
    if (!cityData.kma_code) {
      try {
        // Before investing work, skip if the city already exists
        const exists = await cityExists(cityData);
        if (!exists) {
          const stateAbbr = cityData.state_or_province;
          const RADIUS_MILES_QUERY = 25; // search window (broader)
          const lat = cityData.latitude;
          const lon = cityData.longitude;
          const latRange = RADIUS_MILES_QUERY / 69;
          const lonRange = RADIUS_MILES_QUERY / (69 * Math.cos(lat * Math.PI / 180));

          let { data: candidates, error } = await adminSupabase
            .from('cities')
            .select('city, state_or_province, zip, latitude, longitude, kma_code')
            .gte('latitude', lat - latRange)
            .lte('latitude', lat + latRange)
            .gte('longitude', lon - lonRange)
            .lte('longitude', lon + lonRange)
            .not('kma_code', 'is', null)
            .not('latitude', 'is', null)
            .not('longitude', 'is', null)
            .limit(1000);

          if (error) {
            console.warn('⚠️ Nearest-KMA search failed:', error.message || error);
            candidates = [];
          }

          // Compute distances and prefer same-state rows
          let best = null;
          for (const row of candidates || []) {
            const dist = calculateDistance(lat, lon, row.latitude, row.longitude);
            const sameState = (row.state_or_province || '').toUpperCase() === stateAbbr.toUpperCase();
            const score = { distance: dist, sameState };
            if (!best) {
              best = { row, dist, sameState };
            } else {
              // Prefer closer; if within ~0.5 miles tie, prefer same state
              if (dist < best.dist - 0.5 || (Math.abs(dist - best.dist) <= 0.5 && sameState && !best.sameState)) {
                best = { row, dist, sameState };
              }
            }
          }

          if (best && best.dist <= 10 && best.row?.kma_code) {
            cityData.kma_code = best.row.kma_code;
            cityData.kma = best.row.kma_code;
            console.log(`🧭 Nearest-KMA fallback: ${city}, ${stateAbbr} (${lat.toFixed(4)}, ${lon.toFixed(4)}) ZIP ${zip || 'N/A'} → matched ${best.row.city}, ${best.row.state_or_province} ${best.dist.toFixed(1)}mi → KMA ${best.row.kma_code}`);
          } else {
            console.warn(`⚠️ Nearest-KMA fallback: no known city within 10mi for ${city}, ${stateAbbr} (${lat.toFixed(4)}, ${lon.toFixed(4)}) ZIP ${zip || 'N/A'}`);
          }
        } else {
          console.log('↩️ City already exists in Supabase; skipping nearest-KMA fallback');
        }
      } catch (e) {
        console.warn('⚠️ Nearest-KMA fallback error:', e.message);
      }
    }
  } else {
    console.warn(`⚠️ HERE.com verification failed or incomplete for ${city}, ${state}. Attempting local dataset fallback.`);
    cityData = await localCityLookup(city, state);
    if (!cityData) {
      console.error(`❌ Enrichment failed: no HERE or local dataset results for ${city}, ${state}`);
      return null;
    }
  }

  const { inserted, reason } = await insertCityIntoSupabase(cityData);
  if (!inserted) {
    console.warn(`⚠️ City not inserted: ${cityData.city}, ${cityData.state_or_province} (ZIP: ${cityData.zip}, KMA: ${cityData.kma || cityData.kma_code || 'N/A'}) - Reason: ${reason || 'unknown'}`);
  }

  logEnrichmentResult(cityData, inserted, reason);
  return { ...cityData, inserted, insert_reason: reason };
}

/**
 * Batch enrich multiple cities
 */
export async function batchEnrichCities(cities, source = 'bulk_import') {
  console.log(`📦 Batch enriching ${cities.length} cities`);
  
  const results = {
    total: cities.length,
    successful: 0,
    failed: 0,
    enriched: []
  };
  
  const batchSize = 5; // Process in small batches
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    
    console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(cities.length/batchSize)}`);
    
    const batchPromises = batch.map(city => 
      enrichCityData(city.city, city.state, source)
        .catch(error => {
          console.error(`❌ Failed to enrich ${city.city}, ${city.state}:`, error);
          return null;
        })
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    results.successful += batchResults.filter(r => r !== null).length;
    results.failed += batchResults.filter(r => r === null).length;
    results.enriched.push(...batchResults.filter(r => r !== null));
    
    // Delay between batches
    if (i + batchSize < cities.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n📊 Enrichment Results:');
  console.log(`   Total processed: ${results.total}`);
  console.log(`   Successful: ${results.successful}`);
  console.log(`   Failed: ${results.failed}`);
  
  return results;
}

/**
 * Verify and update existing cities
 */
export async function verifyExistingCities(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Get cities that haven't been verified recently
  const { data: cities, error } = await adminSupabase
    .from('cities')
    .select('*')
    .or(`last_verification.is.null,last_verification.lt.${cutoffDate.toISOString()}`);
    
  if (error) {
    console.error('❌ Failed to fetch cities for verification:', error);
    return;
  }
  
  console.log(`🔍 Verifying ${cities.length} cities older than ${daysOld} days`);
  
  return batchEnrichCities(cities, 'verification');
}

/**
 * Get nearby cities from HERE.com and add to database
 */
export async function discoverNearbyCities(lat, lon, radiusMiles = 75) {
  const cities = await generateAlternativeCitiesWithHERE(lat, lon, radiusMiles);
  return batchEnrichCities(cities, 'discovery');
}
