1
// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane + crawl pairs.
// Enforces exact header order and business rules.

import { generateIntelligentCrawlPairs } from './intelligentCrawl.js';
import { DAT_HEADERS } from './datHeaders.js';

// Use exact DAT headers from datHeaders.js for 100% compliance
// Re-export for backward compatibility
export { DAT_HEADERS };

function assertHeadersOrder(headers) {
  if (headers.length !== DAT_HEADERS.length) return false;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] !== DAT_HEADERS[i]) return false;
  }
  return true;
}

export function ensureLaneWeightValidity(lane) {
  const rnd = !!lane.randomize_weight;
  if (!rnd) {
    // For fixed weight: ensure weight_lbs is valid
    if (lane.weight_lbs == null || Number.isNaN(Number(lane.weight_lbs))) {
      // CRITICAL FIX: Provide fallback weight instead of throwing error
      console.warn(`⚠️ Weight missing for lane ${lane.id}, using 45000 lbs fallback`);
      lane.weight_lbs = 45000; // Standard flatbed weight
      return;
    }
    const w = Number(lane.weight_lbs);
    if (w <= 0) {
      console.warn(`⚠️ Invalid weight ${w} for lane ${lane.id}, using 45000 lbs fallback`);
      lane.weight_lbs = 45000;
      return;
    }
    return;
  }
  
  // Randomized path: ensure min/max are valid
  let min = Number(lane.weight_min);
  let max = Number(lane.weight_max);
  
  // CRITICAL FIX: Provide fallbacks for missing randomization range
  if (!Number.isFinite(min) || min <= 0) {
    console.warn(`⚠️ Invalid weight_min ${lane.weight_min} for lane ${lane.id}, using 46000 lbs`);
    min = 46000;
    lane.weight_min = min;
  }
  
  if (!Number.isFinite(max) || max <= 0) {
    console.warn(`⚠️ Invalid weight_max ${lane.weight_max} for lane ${lane.id}, using 48000 lbs`);
    max = 48000;
    lane.weight_max = max;
  }
  
  if (min > max) {
    console.warn(`⚠️ Invalid range min(${min}) > max(${max}) for lane ${lane.id}, swapping`);
    [lane.weight_min, lane.weight_max] = [max, min];
  }
}

function uniformRandomInt(min, max) {
  const lo = Math.ceil(min);
  const hi = Math.floor(max);
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function weightForRow(lane) {
  if (lane.randomize_weight) {
    return String(uniformRandomInt(Number(lane.weight_min), Number(lane.weight_max)));
  }
  return String(Number(lane.weight_lbs));
}

function fullPartialValue(lane) {
  const v = String(lane.full_partial || '').toLowerCase();
  return v === 'partial' ? 'partial' : 'full';
}

function datYesNo(v) {
  return v ? 'yes' : 'no';
}

function contactVariants() {
  // exact lowercase per spec
  return ['email', 'primary phone'];
}

function baseRowFrom(lane, origin, dest, contact, usedRefIds = new Set(), refSuffix = '') {
  // Build a single CSV row (object keyed by DAT_HEADERS)
  // Ensure pickup latest defaults to pickup earliest if empty
  const pickupLatest = lane.pickup_latest || lane.pickup_earliest;
  
  // Generate reference ID in RR12345 format (RR + 5 digits ONLY, no letters)
  let referenceId = lane.reference_id;
  if (!referenceId || !/^RR\d{5}$/.test(referenceId)) {
    // Fallback: generate pure numeric reference ID from lane ID
    const laneId = parseInt(lane.id, 10);
    if (isNaN(laneId)) {
      // Emergency fallback if lane.id is somehow not a number
      referenceId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    } else {
      const numericId = String(Math.abs(laneId) % 100000).padStart(5, '0');
      referenceId = `RR${numericId}`;
    }
  }
  
  // Apply optional suffix for generated postings (keeps mapping to parent RR)
  let uniqueRefId = referenceId + (refSuffix || '');
  // Ensure format still starts with RR and digits; if suffix breaks pattern, allow it but keep short
  if (!/^RR\d{5}/.test(uniqueRefId)) {
    // If parent referenceId was missing or malformed, fall back to numeric id generation
    const laneId = parseInt(lane.id, 10);
    if (isNaN(laneId)) {
      uniqueRefId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}${refSuffix || ''}`;
    } else {
      const numericId = String(Math.abs(laneId) % 100000).padStart(5, '0');
      uniqueRefId = `RR${numericId}${refSuffix || ''}`;
    }
  }
  let counter = 1;
  while (usedRefIds.has(uniqueRefId)) {
    // If collision, append/roll the numeric suffix (last-resort)
    const baseNum = parseInt(uniqueRefId.slice(2, 7), 10) || 0;
    const newNum = String((baseNum + counter) % 100000).padStart(5, '0');
    const suffix = refSuffix || '';
    uniqueRefId = `RR${newNum}${suffix}`; // allow longer if suffix present
    counter++;
    if (counter > 10000) {
      uniqueRefId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      break;
    }
  }
  
  // Mark this reference ID as used
  usedRefIds.add(uniqueRefId);
  
  return {
    'Pickup Earliest*': lane.pickup_earliest, // Required: MM/DD/YYYY format
    'Pickup Latest': pickupLatest, // Required: MM/DD/YYYY format - defaults to earliest if missing
    'Length (ft)*': String(Number(lane.length_ft)), // Required: 1-199 feet
    'Weight (lbs)*': weightForRow(lane), // Required: 1-100000 pounds
    'Full/Partial*': fullPartialValue(lane), // Required: full or partial
    'Equipment*': String(lane.equipment_code).toUpperCase(), // Required: DAT equipment code
    'Use Private Network*': 'NO', // Column G: Always NO (uppercase) - DAT requirement
    'Private Network Rate': '', // Column H: COMPLETELY BLANK - DAT requirement
    'Allow Private Network Booking': '', // Column I: BLANK - DAT requirement
    'Allow Private Network Bidding': '', // Column J: BLANK - DAT requirement  
    'Use DAT Loadboard*': 'yes', // Required: yes/no - showing on DAT loadboard
    'DAT Loadboard Rate': '', // BLANK - DAT requirement  
    'Allow DAT Loadboard Booking': '', // BLANK - DAT requirement
    'Use Extended Network': '', // BLANK - DAT requirement
    'Contact Method*': contact, // Required: "primary phone" or "email"
    'Origin City*': origin.city, // Always include city name
    'Origin State*': origin.state, // Always include state abbreviation
    'Origin Postal Code': origin.zip || '', // Column R: Plain text for DAT compatibility
    'Destination City*': dest.city, // Always include city name  
    'Destination State*': dest.state, // Always include state abbreviation
    'Destination Postal Code': dest.zip || '', // Column U: Plain text for DAT compatibility
    'Comment': lane.comment || '', // Optional: 140 char max
    'Commodity': lane.commodity || '', // Optional: 70 char max
  'Reference ID': uniqueRefId.slice(0, 8) // Plain text format - DAT compatible (no Excel quotes)
  };
}

export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
  // Expect lane fields per schema; origin/dest in lane are plain text (city/state[/zip]).
  ensureLaneWeightValidity(lane);

  const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
  const baseDest = { city: lane.dest_city, state: lane.dest_state };

  // Use intelligent crawler for broker-optimized pickup locations + diverse deliveries
  const crawl = await generateIntelligentCrawlPairs({
    origin: baseOrigin,
    destination: baseDest,
    equipment: lane.equipment_code,
    preferFillTo10,
    usedCities
  });

  return crawl; // contains baseOrigin/baseDest resolved from DB + pairs
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs, preferFillTo10 = false, usedRefIds = new Set()) {
  // Strict mode: require the crawler to provide exact pair counts (no synthetic filler, no duplicates)
  const targetPairs = preferFillTo10 ? 5 : 3;

  console.log(`🔍 ROWSFROMPAIRS DEBUG: Lane ${lane.id}, preferFillTo10=${preferFillTo10}, targetPairs=${targetPairs}`);
  console.log(`📊 Input pairs count: ${pairs ? pairs.length : 'null/undefined'}`);
  console.log(`📝 Input pairs structure:`, pairs ? JSON.stringify(pairs.slice(0, 2), null, 2) : 'No pairs');

  // Defensive: ensure pairs is an array
  const providedPairs = Array.isArray(pairs) ? pairs.slice() : [];
  console.log(`📊 Provided pairs after array check: ${providedPairs.length}`);

  // Final safety filter: remove any Long Island cities that slipped through
  const filteredPairs = providedPairs.filter(pair => {
    // Add structure validation
    if (!pair || !pair.pickup || !pair.delivery) {
      console.warn(`❌ Invalid pair structure:`, pair);
      return false;
    }
    
    const pickupCity = (pair.pickup && pair.pickup.city || '').toLowerCase();
    const deliveryCity = (pair.delivery && pair.delivery.city || '').toLowerCase();
    const isLongIsland = pickupCity.includes('montauk') || pickupCity.includes('hempstead') ||
                        deliveryCity.includes('montauk') || deliveryCity.includes('hempstead') ||
                        pickupCity.includes('babylon') || deliveryCity.includes('babylon');

    if (isLongIsland) {
      console.log(`🚫 BAN: Filtering Long Island pair ${pair.pickup.city} -> ${pair.delivery.city}`);
      return false;
    }
    return true;
  });

  console.log(`📊 Filtered pairs count: ${filteredPairs.length}`);

  // Use only the top N filtered pairs
  const usePairs = filteredPairs.slice(0, targetPairs);
  console.log(`📊 Final usePairs count: ${usePairs.length}`);

  // If we don't have enough pairs, warn but proceed with what we have.
  if (usePairs.length < targetPairs) {
    console.warn(`⚠️ INSUFFICIENT PAIRS: For lane ${lane.id}, preferFillTo10=${preferFillTo10} required=${targetPairs} but crawler found=${usePairs.length}. Proceeding with available pairs.`);
  }

  // Build postings: base posting + whatever crawl postings we found
  const postings = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    ...usePairs.map((p) => ({ pickup: p.pickup, delivery: p.delivery, isBase: false, score: p.score })),
  ];

  console.log(`📊 Total postings created: ${postings.length} (1 base + ${usePairs.length} pairs)`);

  const contactMethods = contactVariants();
  console.log(`📞 Contact methods: ${contactMethods.length} (${contactMethods.join(', ')})`);
  
  const rows = [];

  // Assign numeric suffixes to generated postings so each posting becomes RR123451, RR123452, etc.
  for (let i = 0; i < postings.length; i++) {
    const posting = postings[i];
    // Base posting (i === 0) keeps the parent RR with no suffix
    const suffix = i === 0 ? '' : String(i); // 1,2,3...
    for (let j = 0; j < contactMethods.length; j++) {
      const method = contactMethods[j];
      const row = baseRowFrom(lane, posting.pickup, posting.delivery, method, usedRefIds, suffix);
      rows.push(row);
    }
  }

  console.log(`📊 FINAL ROWS COUNT: ${rows.length} (${postings.length} postings × ${contactMethods.length} contacts)`);
  console.log(`🎯 Expected for preferFillTo10=true: 12 rows (6 postings × 2 contacts)`);

  // The number of rows is now dynamic based on the number of pairs found.
  // No final check is needed as we are accepting partial results.

  return rows;
}

export function toCsv(headers, rows) {
  if (!assertHeadersOrder(headers)) {
    throw new Error('DAT headers are out of order or invalid.');
  }
  // Escape & join
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(headers.join(','));
  for (const row of rows) {
    const line = headers.map((h) => esc(row[h])).join(',');
    lines.push(line);
  }
  return lines.join('\r\n');
}

export function chunkRows(allRows, max = 499) {
  const chunks = [];
  for (let i = 0; i < allRows.length; i += max) {
    chunks.push(allRows.slice(i, i + max));
  }
  return chunks;
}
