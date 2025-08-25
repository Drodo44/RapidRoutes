1
// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane + crawl pairs.
// Enforces exact header order and business rules.

import { generateCrawlPairs } from './datcrawl.js';
import { generateDiverseCrawlPairs } from './diverseCrawl.js';
import { generateEmergencyUniquePairs } from './emergencyUniqueCrawl.js';
import { emergencyGeneratePairs } from './emergencyDatCrawl.js';
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
    if (lane.weight_lbs == null || Number.isNaN(Number(lane.weight_lbs))) {
      throw new Error('Weight is required when randomize_weight is OFF.');
    }
    const w = Number(lane.weight_lbs);
    if (w <= 0) throw new Error('Weight must be a positive number.');
    return;
  }
  // Randomized path: min/max must be valid
  const min = Number(lane.weight_min);
  const max = Number(lane.weight_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
    throw new Error('Invalid randomization range. Ensure positive min/max and min <= max.');
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
    'Use Private Network*': 'yes', // Required: yes/no - showing to private network
    'Private Network Rate': '', // COMPLETELY BLANK - DAT requirement
    'Allow Private Network Booking': '', // BLANK - DAT requirement
    'Allow Private Network Bidding': 'no', // Column G: Always NO - DAT requirement  
    'Use DAT Loadboard*': 'yes', // Required: yes/no - showing on DAT loadboard
    'DAT Loadboard Rate': '', // Column H: COMPLETELY BLANK - DAT requirement  
    'Allow DAT Loadboard Booking': '', // Column I: BLANK - DAT requirement
    'Use Extended Network': '', // Column J: BLANK - DAT requirement
    'Contact Method*': contact, // Required: "primary phone" or "email"
    'Origin City*': origin.city, // Always include city name
    'Origin State*': origin.state, // Always include state abbreviation
    'Origin Postal Code': origin.zip ? `="` + (origin.zip || '') + `"` : '', // TEXT FORMAT for leading zeros
    'Destination City*': dest.city, // Always include city name  
    'Destination State*': dest.state, // Always include state abbreviation
    'Destination Postal Code': dest.zip ? `="` + (dest.zip || '') + `"` : '', // TEXT FORMAT for leading zeros
    'Comment': lane.comment || '', // Optional: 140 char max
    'Commodity': lane.commodity || '', // Optional: 70 char max
    'Reference ID': `="` + uniqueRefId.slice(0, 8) + `"` // TEXT FORMAT - Forces Excel to preserve text (displays as RR12345)
  };
}

export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
  // Expect lane fields per schema; origin/dest in lane are plain text (city/state[/zip]).
  ensureLaneWeightValidity(lane);

  const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
  const baseDest = { city: lane.dest_city, state: lane.dest_state };

  // Use diverse crawler for optimal city pair generation with global uniqueness
  const crawl = await generateDiverseCrawlPairs({
    origin: baseOrigin,
    destination: baseDest,
    equipment: lane.equipment_code,
    preferFillTo10,
    usedCities
  });

  return crawl; // contains baseOrigin/baseDest resolved from DB + pairs
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs, preferFillTo10 = false, usedRefIds = new Set()) {
  // Generate exactly 6 postings (1 base + 5 pairs) when preferFillTo10=true
  // Otherwise use all provided pairs
  let usePairs = pairs;
  if (preferFillTo10) {
    // Force exactly 5 pairs
    usePairs = pairs.slice(0, 5);
    while (usePairs.length < 5) {
      console.log(`⚠️ FILLING TO 5: Adding synthetic pair ${usePairs.length + 1}/5`);
      usePairs.push({
        pickup: baseOrigin,
        delivery: baseDest,
        score: 0.1,
        synthetic: true
      });
    }
  }

  // Build the list of postings
  const postings = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    ...usePairs.map((p) => ({ pickup: p.pickup, delivery: p.delivery, isBase: false, score: p.score })),
  ];
  console.log(`🎯 POSTINGS CREATED: ${postings.length} total (1 base + ${usePairs.length} pairs)`);
  console.log(`📍 BASE POSTING: ${baseOrigin.city}, ${baseOrigin.state} -> ${baseDest.city}, ${baseDest.state}`);

  // CRITICAL VALIDATION: Must have exactly 6 postings in Fill-to-5 mode (1 base + 5 pairs)
  if (preferFillTo10 && postings.length !== 6) {
    console.error(`🚨 CRITICAL ERROR: In Fill-to-5 mode but have ${postings.length} postings instead of 6!`);
    
    // Emergency fix: Force exactly 6 postings
    while (postings.length < 6) {
      console.log(`🚨 EMERGENCY: Adding synthetic posting to reach 6 postings`);
      postings.push({ 
        pickup: baseOrigin, 
        delivery: baseDest, 
        isBase: false,
        score: 0.1,
        emergency: true
      });
    }
    if (postings.length > 6) {
      console.log(`🚨 EMERGENCY: Trimming excess postings from ${postings.length} to 6`);
      postings.splice(6); // Keep only first 6
    }
  }

  const contactMethods = contactVariants();
  console.log(`📞 CONTACT METHODS: ${contactMethods.length} (${contactMethods.join(', ')})`);
  
  // Calculate expected row count ahead of time
  const expectedRowCount = postings.length * contactMethods.length;
  console.log(`🔢 EXPECTED ROW COUNT: ${postings.length} postings × ${contactMethods.length} contacts = ${expectedRowCount} rows`);

  const rows = [];
  for (let i = 0; i < postings.length; i++) {
    const posting = postings[i];
    console.log(`🔄 PROCESSING POSTING ${i+1}/${postings.length}: ${posting.pickup.city}, ${posting.pickup.state} -> ${posting.delivery.city}, ${posting.delivery.state}`);
    
    for (let j = 0; j < contactMethods.length; j++) {
      const method = contactMethods[j];
      const row = baseRowFrom(lane, posting.pickup, posting.delivery, method, usedRefIds);
      rows.push(row);
      console.log(`  ➕ ROW ${rows.length}: ${method} contact`);
    }
  }
  
  console.log(`🎉 ROW BUILDER COMPLETE: Generated ${rows.length} rows`);
  console.log(`✅ EXPECTED: ${preferFillTo10 ? 12 : (usePairs.length + 1) * 2} rows`);
  console.log(`⚡ CALCULATION: ${postings.length} postings × ${contactMethods.length} contacts = ${postings.length * contactMethods.length} rows`);
  
  // CRITICAL ASSERT: Ensure we meet the guarantee
  const expectedRows = preferFillTo10 ? 12 : (usePairs.length + 1) * 2;
  if (rows.length !== expectedRows) {
    console.error(`💥 ROW COUNT MISMATCH: Generated ${rows.length}, expected ${expectedRows}`);
    console.error(`💥 Debug info: postings=${postings.length}, contacts=${contactMethods.length}, preferFillTo10=${preferFillTo10}`);
    throw new Error(`Row count guarantee failed: got ${rows.length}, expected ${expectedRows}`);
  }
  
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
