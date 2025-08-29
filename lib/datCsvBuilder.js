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
  // CRITICAL FIX: Create a copy to avoid modifying original user data
  const safeLane = { ...lane };
  
  const rnd = !!safeLane.randomize_weight;
  if (!rnd) {
    // For fixed weight: ensure weight_lbs is valid
    if (safeLane.weight_lbs == null || Number.isNaN(Number(safeLane.weight_lbs))) {
      console.warn(`⚠️ Weight missing for lane ${safeLane.id}, using 45000 lbs fallback for CSV generation`);
      safeLane.weight_lbs = 45000; // Standard flatbed weight
      return safeLane;
    }
    const w = Number(safeLane.weight_lbs);
    if (w <= 0) {
      console.warn(`⚠️ Invalid weight ${w} for lane ${safeLane.id}, using 45000 lbs fallback for CSV generation`);
      safeLane.weight_lbs = 45000;
      return safeLane;
    }
    return safeLane;
  }
  
  // Randomized path: ensure min/max are valid
  let min = Number(safeLane.weight_min);
  let max = Number(safeLane.weight_max);
  
  // CRITICAL FIX: Provide fallbacks for missing randomization range
  if (!Number.isFinite(min) || min <= 0) {
    console.warn(`⚠️ Invalid weight_min ${safeLane.weight_min} for lane ${safeLane.id}, using 46000 lbs for CSV generation`);
    min = 46000;
    safeLane.weight_min = min;
  }
  
  if (!Number.isFinite(max) || max <= 0) {
    console.warn(`⚠️ Invalid weight_max ${safeLane.weight_max} for lane ${safeLane.id}, using 48000 lbs for CSV generation`);
    max = 48000;
    safeLane.weight_max = max;
  }
  
  if (min > max) {
    console.warn(`⚠️ Invalid range min(${min}) > max(${max}) for lane ${safeLane.id}, swapping for CSV generation`);
    [safeLane.weight_min, safeLane.weight_max] = [max, min];
  }
  
  return safeLane;
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

function baseRowFrom(lane, origin, dest, contact, usedRefIds = new Set()) {
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
  
  // Ensure reference ID uniqueness within this CSV export
  let uniqueRefId = referenceId;
  let counter = 1;
  while (usedRefIds.has(uniqueRefId)) {
    // Generate alternative unique reference ID
    const baseNum = parseInt(uniqueRefId.slice(2), 10);
    const newNum = String((baseNum + counter) % 100000).padStart(5, '0');
    uniqueRefId = `RR${newNum}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 100000) {
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
    'Origin Postal Code': origin.zip || '', // Column R: Clean text format for DAT compatibility
    'Destination City*': dest.city, // Always include city name  
    'Destination State*': dest.state, // Always include state abbreviation
    'Destination Postal Code': dest.zip || '', // Column U: Clean text format
    'Comment': lane.comment || '', // Optional: 140 char max
    'Commodity': lane.commodity || '', // Optional: 70 char max
    'Reference ID': uniqueRefId.slice(0, 8) // Clean RR12345 format - NO Excel formatting for DAT compatibility
  };
}

export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
  // Expect lane fields per schema; origin/dest in lane are plain text (city/state[/zip]).
  // Create safe copy with validated weights without modifying original
  const safeLane = ensureLaneWeightValidity(lane);

  const baseOrigin = { city: safeLane.origin_city, state: safeLane.origin_state };
  const baseDest = { city: safeLane.dest_city, state: safeLane.dest_state };

  try {
    // Use intelligent crawler for broker-optimized pickup locations + diverse deliveries
    const crawl = await generateIntelligentCrawlPairs({
      origin: baseOrigin,
      destination: baseDest,
      equipment: safeLane.equipment_code,
      preferFillTo10,
      usedCities
    });

    // Validate crawl result
    if (!crawl || !Array.isArray(crawl.pairs)) {
      console.error(`❌ CRAWL FAILED for lane ${safeLane.id}: Invalid crawl result`, crawl);
      throw new Error('Invalid crawl result');
    }

    console.log(`✅ CRAWL SUCCESS for lane ${safeLane.id}: ${crawl.pairs.length} pairs generated`);
    
    // Return both crawl data and safe lane copy
    return { ...crawl, safeLane }; // contains baseOrigin/baseDest resolved from DB + pairs + safeLane
    
  } catch (error) {
    console.error(`❌ INTELLIGENT CRAWL FAILED for lane ${safeLane.id}:`, error);
    console.error('Falling back to basic origin/destination only');
    
    // Return minimal valid structure - just base posting, no crawl pairs
    return {
      baseOrigin,
      baseDest,
      pairs: [], // Empty pairs array - will result in base posting only
      safeLane,
      error: error.message
    };
  }
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs, preferFillTo10 = false, usedRefIds = new Set()) {
  // Use safe lane copy to avoid modifying original user data
  const safeLane = ensureLaneWeightValidity(lane);
  
  // CORRECTED: 5 pairs minimum (+ 1 base = 6 total postings = 12 minimum rows)
  const targetPairs = 5; // Always 5 pairs minimum, no maximum

  console.log(`🔍 ROWSFROMPAIRS DEBUG: Lane ${safeLane.id}, preferFillTo10=${preferFillTo10}, targetPairs=${targetPairs}`);
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

  // Use ALL filtered pairs (no maximum limit) but ensure minimum of 5
  const usePairs = filteredPairs.length >= targetPairs 
    ? filteredPairs // Use all pairs found (no maximum)
    : filteredPairs.slice(0, Math.max(filteredPairs.length, 0)); // Use what we have
  
  console.log(`📊 Final usePairs count: ${usePairs.length} (minimum required: ${targetPairs})`);

  // If we don't have enough pairs, warn but proceed with what we have.
  if (usePairs.length < targetPairs) {
    console.warn(`⚠️ INSUFFICIENT PAIRS: For lane ${safeLane.id}, required minimum=${targetPairs} but crawler found=${usePairs.length}. Proceeding with available pairs.`);
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

  for (let i = 0; i < postings.length; i++) {
    const posting = postings[i];
    for (let j = 0; j < contactMethods.length; j++) {
      const method = contactMethods[j];
      const row = baseRowFrom(safeLane, posting.pickup, posting.delivery, method, usedRefIds);
      rows.push(row);
    }
  }

  const totalPostings = 1 + usePairs.length;
  const expectedRows = totalPostings * contactMethods.length;
  console.log(`📊 FINAL ROWS COUNT: ${rows.length} (${totalPostings} postings × ${contactMethods.length} contacts)`);
  console.log(`🎯 Expected minimum: ${6 * contactMethods.length} rows (6 minimum postings × ${contactMethods.length} contacts)`);

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
