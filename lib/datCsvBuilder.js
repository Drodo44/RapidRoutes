1
// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane + crawl pairs.
// Enforces exact header order and business rules.

import { generateCrawlPairs } from './datcrawl.js';
import { generateDiverseCrawlPairs } from './diverseCrawl.js';
import { generateIntelligentCrawlPairs } from './intelligentCrawl.js';
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
    'Origin Postal Code': origin.zip ? `="` + (origin.zip || '') + `"` : '', // Column R: TEXT FORMAT for leading zeros
    'Destination City*': dest.city, // Always include city name  
    'Destination State*': dest.state, // Always include state abbreviation
    'Destination Postal Code': dest.zip ? `="` + (dest.zip || '') + `"` : '', // Column U: TEXT FORMAT for leading zeros
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
  // Use exactly the pairs we get - NO synthetic filling
  const usePairs = preferFillTo10 ? pairs.slice(0, 5) : pairs;
  
  console.log(`🎯 Using ${usePairs.length} real geographic pairs (NO SYNTHETIC FILLING)`);
  
  // Build the list of postings
  const postings = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    ...usePairs.map((p) => ({ pickup: p.pickup, delivery: p.delivery, isBase: false, score: p.score })),
  ];
  console.log(`🎯 POSTINGS CREATED: ${postings.length} total (1 base + ${usePairs.length} pairs)`);
  console.log(`📍 BASE POSTING: ${baseOrigin.city}, ${baseOrigin.state} -> ${baseDest.city}, ${baseDest.state}`);

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
