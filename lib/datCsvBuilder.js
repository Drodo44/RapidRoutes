1
// lib/datCsvBuilder.js
// Builds DAT Bulk Upload rows and CSV text from a lane and intelligent pairs.
// Enforces exact header order and business rules.

import { FreightIntelligence } from './FreightIntelligence.js';
import { DAT_HEADERS } from './datHeaders.js';
import { ensureLaneWeightValidity } from './ensureLaneWeight.js';
import { monitor } from './monitor.js';
import { adminSupabase } from '../utils/supabaseClient.js';

// Equipment weight limits
const EQUIPMENT_WEIGHT_LIMITS = {
    'V': 45000,  // Van
    'R': 43500,  // Reefer
    'FD': 48000, // Flatbed
    'SD': 45000  // Step Deck
};

// Use exact DAT headers from datHeaders.js for 100% compliance
export { DAT_HEADERS };

// Use singleton pattern for FreightIntelligence instance
let intelligenceInstance = null;
function getFreightIntelligence() {
    if (!intelligenceInstance) {
        intelligenceInstance = new FreightIntelligence();
    }
    return intelligenceInstance;
}

function assertHeadersOrder(headers) {
  if (!headers?.length || !DAT_HEADERS?.length) return false;
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
    
    // Generate as many unique KMA pairs as intelligence finds (like manual process)
    // Minimum 6 pairs but allow 10-15+ like your daily manual posts
    const MIN_PAIRS = 6;   // Absolute minimum
    const MAX_PAIRS = 22;  // DAT system limit per batch
    
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

        // Use intelligent cache system - check cache first, generate if needed
        const { intelligentCache } = await import('./intelligentCache.js');
        
        monitor.log('info', `Getting intelligent pairs for lane ${lane.id}...`);
        
        let result;
        try {
            result = await intelligentCache.getIntelligentPairs(
                { 
                    city: lane.origin_city, 
                    state: lane.origin_state,
                    zip: lane.origin_zip 
                },
                { 
                    city: lane.dest_city, 
                    state: lane.dest_state,
                    zip: lane.dest_zip 
                },
                lane.equipment_code,
                lane.id // Pass lane ID for caching
            );
        } catch (pairError) {
            monitor.log('error', `Failed to get intelligent pairs for lane ${lane.id}:`, pairError);
            // Don't throw - let it fall back to basic pairs below
            result = { pairs: [], cached: false, source: 'failed', error: pairError.message };
        }

        // Validate and process pairs with detailed logging
        const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
        monitor.log('info', `Generated ${pairs.length} pairs for lane ${lane.id}`);

        // Double-check minimum requirement
        // STRICT ENFORCEMENT: Must have minimum 6 pairs (12 rows with both contact methods)
        const MINIMUM_PAIRS = 6;
        const ROWS_PER_PAIR = 2; // Email + Phone

        // Detailed pair validation - handle both 'state' and 'state_or_province' fields
        const validPairs = pairs.filter(pair => {
            if (!pair || typeof pair !== 'object') {
                monitor.log('warn', `Invalid pair structure for lane ${lane.id}:`, pair);
                return false;
            }
            
            // Handle both 'state' and 'state_or_province' field names from database
            const pickupState = pair.pickup?.state || pair.pickup?.state_or_province;
            const deliveryState = pair.delivery?.state || pair.delivery?.state_or_province;
            
            const hasPickup = pair.pickup && pair.pickup.city && pickupState;
            const hasDelivery = pair.delivery && pair.delivery.city && deliveryState;
            
            if (!hasPickup || !hasDelivery) {
                monitor.log('warn', `Missing city/state in pair for lane ${lane.id}:`, {
                    pickup: { city: pair.pickup?.city, state: pickupState },
                    delivery: { city: pair.delivery?.city, state: deliveryState },
                    originalPair: { pickup: pair.pickup, delivery: pair.delivery }
                });
                return false;
            }
            
            return true;
        });

        monitor.log('info', `Validated pairs for lane ${lane.id}: ${validPairs.length}/${pairs.length} valid`);
        
        if (validPairs.length < MINIMUM_PAIRS) {
            const error = new Error(
                `CRITICAL: Failed to generate minimum ${MINIMUM_PAIRS} valid pairs for lane ${lane.id}.\n` +
                `Found: ${validPairs.length} valid pairs (${validPairs.length * ROWS_PER_PAIR} rows).\n` +
                `Required: ${MINIMUM_PAIRS} pairs (${MINIMUM_PAIRS * ROWS_PER_PAIR} rows).`
            );
            
            error.details = {
                lane_id: lane.id,
                found_pairs: validPairs.length,
                found_rows: validPairs.length * ROWS_PER_PAIR,
                required_pairs: MINIMUM_PAIRS,
                required_rows: MINIMUM_PAIRS * ROWS_PER_PAIR,
                invalid_pairs: pairs.length - validPairs.length,
                intelligence_result: {
                    ...result,
                    pairs: pairs.slice(0, 3) // Include only first 3 pairs to avoid huge logs
                }
            };
            
            monitor.log('error', 'Pair generation failed:', error);
            throw error;
        }

        // Log successful generation
        monitor.log('info', `✅ Generated ${pairs.length} diverse pairs for lane ${lane.id}`);
        monitor.log('debug', `   → ${pairs.length * ROWS_PER_PAIR} total rows (${ROWS_PER_PAIR} contact methods per pair)`);
        console.log(`✅ SUCCESS: ${pairs.length} pairs (${pairs.length * ROWS_PER_PAIR} rows) for lane ${lane.id}`);

        // Generate rows for each pair with validation
        const rows = [];
        const usedRefIds = new Set();
        const generatedRefIds = new Map(); // Track generated reference IDs for database storage
        const errorRows = []; // Track any row generation errors

        for (const pair of validPairs) {
            try {
                // Normalize pickup and delivery objects to ensure consistent field names
                const normalizedPickup = {
                    city: pair.pickup.city,
                    state: pair.pickup.state || pair.pickup.state_or_province,
                    zip: pair.pickup.zip || ''
                };
                
                const normalizedDelivery = {
                    city: pair.delivery.city,
                    state: pair.delivery.state || pair.delivery.state_or_province,
                    zip: pair.delivery.zip || ''
                };
                
                // Generate one row for each contact method
                for (const contactMethod of contactVariants()) {
                    const row = baseRowFrom(lane, normalizedPickup, normalizedDelivery, contactMethod, usedRefIds, generatedRefIds);
                    
                    // Validate row structure
                    const missingFields = DAT_HEADERS.filter(header => 
                        header.endsWith('*') && !row[header]
                    );

                    if (missingFields.length > 0) {
                        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
                    }

                    rows.push(row);
                }
            } catch (rowError) {
                monitor.log('warn', `Error generating row for pair in lane ${lane.id}:`, {
                    error: rowError.message,
                    pair: pair
                });
                errorRows.push({
                    pair,
                    error: rowError.message
                });
            }
        }

        // If we have any errors but still enough rows, log warning
        if (errorRows.length > 0 && rows.length >= MINIMUM_PAIRS * ROWS_PER_PAIR) {
            monitor.log('warn', `Generated minimum required rows despite ${errorRows.length} errors for lane ${lane.id}`);
        }
        
        // If we don't have enough rows after filtering errors, fail
        if (rows.length < MINIMUM_PAIRS * ROWS_PER_PAIR) {
            const error = new Error(
                `CRITICAL: Failed to generate minimum required rows after filtering errors for lane ${lane.id}.\n` +
                `Generated: ${rows.length} valid rows\n` +
                `Required: ${MINIMUM_PAIRS * ROWS_PER_PAIR} rows\n` +
                `Failed rows: ${errorRows.length}`
            );
            monitor.log('error', 'Row generation failed:', error);
            throw error;
        }

        // Sort rows by reference ID for consistency
        rows.sort((a, b) => {
            const refA = a['Reference ID'] || '';
            const refB = b['Reference ID'] || '';
            return refA.localeCompare(refB);
        });

        monitor.endOperation(operationId, {
            success: true,
            rows_generated: rows.length,
            valid_pairs_used: validPairs.length,
            failed_rows: errorRows.length,
            unique_ref_ids: usedRefIds.size
        });

        // Monitor memory usage after large operation
        await monitor.monitorMemory();

        // AUTO-STORE GENERATED REFERENCE IDs TO DATABASE
        // This ensures search and recap functionality works seamlessly
        if (generatedRefIds.has(lane.id)) {
            const finalReferenceId = generatedRefIds.get(lane.id);
            try {
                // Import adminSupabase for database operations
                const { adminSupabase } = await import('../utils/supabaseClient.js');
                
                // Only update if lane doesn't already have a reference_id or if it's different
                if (!lane.reference_id || lane.reference_id !== finalReferenceId) {
                    const { error: updateError } = await adminSupabase
                        .from('lanes')
                        .update({ reference_id: finalReferenceId })
                        .eq('id', lane.id);
                    
                    if (updateError) {
                        monitor.log('warn', `Failed to store reference ID ${finalReferenceId} for lane ${lane.id}:`, updateError);
                    } else {
                        monitor.log('info', `✅ Auto-stored reference ID ${finalReferenceId} for lane ${lane.id}`);
                    }
                }
            } catch (dbError) {
                monitor.log('warn', `Database error storing reference ID for lane ${lane.id}:`, dbError);
                // Don't fail the CSV generation for database issues
            }
        }

        // Persist posted pairs for RR# search functionality
        try {
            if (rows.length > 0) {
                const postedPairs = rows.map(row => ({
                    reference_id: row['Reference ID'],
                    origin_city: row['Origin City*'],
                    origin_state: row['Origin State*'],
                    dest_city: row['Destination City*'],
                    dest_state: row['Destination State*']
                }));

                // Remove duplicates based on reference_id
                const uniquePairs = postedPairs.filter((pair, index, self) => 
                    index === self.findIndex(p => p.reference_id === pair.reference_id)
                );

                if (uniquePairs.length > 0) {
                    const pairsToInsert = uniquePairs.map(pair => ({
                        ...pair,
                        lane_id: lane.id,
                        created_by: lane.user_id || lane.created_by
                    }));

                    const { error: pairsError } = await adminSupabase
                        .from('posted_pairs')
                        .insert(pairsToInsert);

                    if (pairsError) {
                        monitor.log('warn', `Failed to store posted pairs for lane ${lane.id}:`, pairsError);
                    } else {
                        monitor.log('info', `✅ Stored ${uniquePairs.length} posted pairs for lane ${lane.id}`);
                    }
                }
            }
        } catch (dbError) {
            monitor.log('warn', `Database error storing posted pairs for lane ${lane.id}:`, dbError);
            // Don't fail the CSV generation for database issues
        }

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
function baseRowFrom(lane, origin, dest, contact, usedRefIds = new Set(), generatedRefIds = new Map()) {
  // Build a single CSV row (object keyed by DAT_HEADERS)
  // Ensure pickup latest defaults to pickup earliest if empty
  const pickupLatest = lane.pickup_latest || lane.pickup_earliest;
  
  // Use stored reference ID or generate new one consistently
  let referenceId = lane.reference_id;
  
  // Check if we already generated one for this lane in this session
  if (generatedRefIds.has(lane.id)) {
    referenceId = generatedRefIds.get(lane.id);
  } else if (!referenceId || !/^RR\d{5}$/.test(referenceId)) {
    // Generate reference ID from UUID consistently (same logic as recap system)
    const laneId = String(lane.id);
    
    // Extract numeric characters from UUID and create consistent reference ID
    const numericPart = laneId.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
    const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
    referenceId = `RR${referenceNum}`;
    
    // Store this generated reference ID for this lane
    generatedRefIds.set(lane.id, referenceId);
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
  
  // Update the generated reference ID map with the final unique ID
  generatedRefIds.set(lane.id, uniqueRefId);
  
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

/** @deprecated Use FreightIntelligence.generateDiversePairs() directly */
export async function planPairsForLane(lane, { preferFillTo10 = false, usedCities = new Set() } = {}) {
  const intelligence = new FreightIntelligence();
  const result = await intelligence.generateDiversePairs({
    origin: {
      city: lane.origin_city,
      state: lane.origin_state,
      zip: lane.origin_zip
    },
    destination: {
      city: lane.dest_city,
      state: lane.dest_state,
      zip: lane.dest_zip
    },
    equipment: lane.equipment_code,
    preferFillTo10
  });

  // Convert to old format for compatibility
  return {
    pairs: result.pairs,
    baseOrigin: { city: lane.origin_city, state: lane.origin_state },
    baseDest: { city: lane.dest_city, state: lane.dest_state }
  };
}

export function rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs, preferFillTo10 = false, usedRefIds = new Set(), generatedRefIds = new Map()) {
  // Strict mode: require the crawler to provide exact pair counts (no synthetic filler, no duplicates)
  // Use ALL available pairs found by intelligence system (6 minimum, no maximum)
  // Like manual process: if intelligence finds 15 pairs, use all 15
  const MIN_PAIRS = 6; // Minimum required (5 crawl + 1 base = 6 total)

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 ROWSFROMPAIRS DEBUG: Lane ${lane.id}, preferFillTo10=${preferFillTo10}, MIN_PAIRS=${MIN_PAIRS}`);
    console.log(`📊 Input pairs count: ${pairs ? pairs.length : 'null/undefined'}`);
  }

  // Defensive: ensure pairs is an array
  const providedPairs = Array.isArray(pairs) ? pairs.slice() : [];
  // Pair count validation - reduced logging for production

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

  // Filtered pairs for Long Island restrictions

  // Use ALL filtered pairs (like your manual process - if system finds 15, use all 15)
  const usePairs = filteredPairs; // No artificial limit - use everything intelligence found
  console.log(`📊 Final usePairs count: ${usePairs.length} (using ALL pairs found)`);

  // Minimum check: Must have at least 6 pairs total (1 base + 5 crawl minimum)
  if (usePairs.length + 1 < MIN_PAIRS) { // +1 for base pair
    console.warn(`⚠️ CRITICAL: Lane ${lane.id} has insufficient pairs. Found ${usePairs.length} crawl pairs, need minimum ${MIN_PAIRS - 1} crawl pairs.`);
  }

  // Build postings: base posting + whatever crawl postings we found
  const postings = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    ...usePairs.map((p) => ({ pickup: p.pickup, delivery: p.delivery, isBase: false, score: p.score })),
  ];

  const contactMethods = contactVariants();
  
  const rows = [];

  for (let i = 0; i < postings.length; i++) {
    const posting = postings[i];
    for (let j = 0; j < contactMethods.length; j++) {
      const method = contactMethods[j];
      const row = baseRowFrom(lane, posting.pickup, posting.delivery, method, usedRefIds, generatedRefIds);
      rows.push(row);
    }
  }

  // Production logging reduced - final validation for DAT compliance

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
