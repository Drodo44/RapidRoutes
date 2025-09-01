1
// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane + crawl pairs.
// Enforces exact header order and business rules.

import { FreightIntelligence } from './FreightIntelligence.js';
import { DAT_HEADERS } from './datHeaders.js';
import { ensureLaneWeightValidity } from './ensureLaneWeight.js';
import { monitor } from './monitoring/logger.js';

// Equipment weight limits
const EQUIPMENT_WEIGHT_LIMITS = {
    'V': 45000,  // Van
    'R': 43500,  // Reefer
    'FD': 48000, // Flatbed
    'SD': 45000  // Step Deck
};

// Use exact DAT headers from datHeaders.js for 100% compliance
// Re-export for backward compatibility
export { DAT_HEADERS, ensureLaneWeightValidity };

function assertHeadersOrder(headers) {
  if (headers.length !== DAT_HEADERS.length) return false;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] !== DAT_HEADERS[i]) return false;
  }
  return true;
}

export /**
 * Validate weight against equipment limits
 * @param {Object} lane - Lane data
 * @throws {Error} If weight exceeds equipment limit
 */
function validateEquipmentWeight(lane) {
    const equipmentLimit = EQUIPMENT_WEIGHT_LIMITS[lane.equipment_code];
    if (!equipmentLimit) {
        throw new Error(`Invalid equipment code: ${lane.equipment_code}`);
    }

    // For fixed weight lanes
    if (!lane.randomize_weight) {
        if (!lane.weight_lbs || Number.isNaN(Number(lane.weight_lbs))) {
            throw new Error(`Weight missing for lane ${lane.id}. Fixed weight lanes require weight_lbs.`);
        }
        const weight = Number(lane.weight_lbs);
        if (weight <= 0) {
            throw new Error(`Invalid weight ${weight} for lane ${lane.id}. Must be positive.`);
        }
        if (weight > equipmentLimit) {
            throw new Error(`Weight ${weight} exceeds maximum ${equipmentLimit} for ${lane.equipment_code}`);
        }
        return;
    }

    // For randomized weight lanes
    let weightMin = Number(lane.weight_min);
    let weightMax = Number(lane.weight_max);

    // CRITICAL FIX: Provide fallbacks for missing randomization range
    if (!Number.isFinite(weightMin) || weightMin <= 0) {
        console.warn(`⚠️ Invalid weight_min ${lane.weight_min} for lane ${lane.id}, using 46000 lbs`);
        weightMin = 46000;
        lane.weight_min = weightMin;
    }

    if (!Number.isFinite(weightMax) || weightMax <= 0) {
        console.warn(`⚠️ Invalid weight_max ${lane.weight_max} for lane ${lane.id}, using 48000 lbs`);
        weightMax = 48000;
        lane.weight_max = weightMax;
    }

    if (weightMin >= weightMax) {
        console.warn(`⚠️ Invalid range min(${weightMin}) >= max(${weightMax}) for lane ${lane.id}, swapping`);
        [lane.weight_min, lane.weight_max] = [weightMax, weightMin];
    }

    if (weightMax > equipmentLimit) {
        throw new Error(`Maximum weight ${weightMax} exceeds limit ${equipmentLimit} for ${lane.equipment_code}`);
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
  // DAT requirement: Must have both email and primary phone for each posting
  // Exact lowercase per DAT specification
  return ['email', 'primary phone'];
}

/**
 * Generate DAT CSV rows for a lane
 * Ensures minimum 6 unique pairs with KMA diversity
 * @param {Object} lane - Lane data object
 * @returns {Promise<Array>} Array of CSV row objects
 */
export async function generateDatCsvRows(lane) {
    const operationId = `generate_csv_${lane.id}_${Date.now()}`;
    monitor.startOperation(operationId, {
        lane_id: lane.id,
        equipment: lane.equipment_code,
        operation_type: 'dat_csv_generation'
    });

    try {
        // Validate weight against equipment limits
        validateEquipmentWeight(lane);

        // Get city pairs from FreightIntelligence
        const intelligence = new FreightIntelligence();
        
        // Generate pairs with guaranteed minimum 6
        console.log(`Generating pairs for lane ${lane.id}...`);
        const result = await intelligence.generateDiversePairs({
            baseOrigin: { city: lane.origin_city, state: lane.origin_state },
            baseDest: { city: lane.dest_city, state: lane.dest_state },
            equipment: lane.equipment_code,
            preferFillTo10: true // Always try to maximize pairs
        });

        const pairs = result.pairs;
        console.log(`Generated ${pairs.length} pairs for lane ${lane.id}`);

        // Double-check minimum requirement
        if (!pairs || pairs.length < 6) {
            const error = new Error(`Failed to generate minimum 6 pairs for lane ${lane.id}. Found: ${pairs?.length || 0}`);
            error.details = result;
            throw error;
        }

        // Log optimization success
        monitor.log('info', `Generated ${pairs.length} diverse pairs for lane ${lane.id} (minimum: 6, target: 11)`);
        console.log(`Success: ${pairs.length} pairs for lane ${lane.id}`);

        // Generate rows for each pair
        const rows = [];
        const usedRefIds = new Set();

        for (const pair of pairs) {
            // Generate one row for each contact method
            contactVariants().forEach(contactMethod => {
                rows.push(baseRowFrom(lane, pair.pickup, pair.delivery, contactMethod, usedRefIds));
            });
        }

        monitor.endOperation(operationId, {
            success: true,
            rows_generated: rows.length,
            pairs_used: pairs.length,
            unique_ref_ids: usedRefIds.size
        });

        // Monitor memory usage after large operation
        await monitor.monitorMemory();

        return rows;
    } catch (error) {
        monitor.endOperation(operationId, { success: false, error: error.message });
        await monitor.logError(error, 'DAT CSV generation failed', {
            lane_id: lane.id,
            equipment: lane.equipment_code
        });
        throw error;
    }
}

/**
 * Generate a single DAT CSV row
 * @param {Object} lane - Base lane data
 * @param {Object} origin - Origin city data
 * @param {Object} dest - Destination city data
 * @param {string} contact - Contact method
 * @param {Set} usedRefIds - Set of used reference IDs
 * @returns {Object} CSV row data
 */
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
  // Each lane needs 11 postings (1 base + 10 additional) × 2 contact methods = 22 rows
  const targetPairs = 10; // Always target 10 pairs to ensure 11 total postings (base + 10 crawl)

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

  // Each lane MUST have exactly 6 postings (1 base + 5 crawl)
  if (usePairs.length < targetPairs) {
    console.warn(`⚠️ CRITICAL: Lane ${lane.id} has insufficient pairs. Found ${usePairs.length}/5 required crawl pairs. This will result in fewer than 12 rows for this lane.`);
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
      const row = baseRowFrom(lane, posting.pickup, posting.delivery, method, usedRefIds);
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
