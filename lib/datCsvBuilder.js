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

// Constants for pair/row generation
export const MIN_PAIRS_REQUIRED = 6; // Minimum required pairs (1 original + 5+ generated), no maximum
export const ROWS_PER_PAIR = 2;      // Each pair gets email + phone

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

// Comprehensive header validation with detailed reporting
function assertHeadersOrder(headers) {
  const validation = {
    headersPresent: headers?.length > 0,
    templatePresent: DAT_HEADERS?.length > 0,
    lengthMatch: false,
    orderMatch: false,
    mismatches: []
  };

  if (!validation.headersPresent || !validation.templatePresent) {
    const error = new Error('DAT headers validation failed');
    error.validation = validation;
    error.details = `headers=${headers?.length}, DAT_HEADERS=${DAT_HEADERS?.length}`;
    monitor.log('error', 'Header validation failed:', error);
    throw error;
  }

  validation.lengthMatch = headers.length === DAT_HEADERS.length;
  if (!validation.lengthMatch) {
    const error = new Error(`DAT headers length mismatch: got ${headers.length}, expected ${DAT_HEADERS.length}`);
    error.validation = validation;
    monitor.log('error', 'Header length mismatch:', error);
    throw error;
  }

  for (let i = 0; i < headers.length; i++) {
    if (headers[i] !== DAT_HEADERS[i]) {
      validation.mismatches.push({
        position: i,
        expected: DAT_HEADERS[i],
        received: headers[i]
      });
    }
  }

  validation.orderMatch = validation.mismatches.length === 0;
  if (!validation.orderMatch) {
    const error = new Error('DAT headers order mismatch');
    error.validation = validation;
    error.details = validation.mismatches;
    monitor.log('error', 'Header order mismatch:', error);
    throw error;
  }

  monitor.log('info', '✅ DAT headers validated successfully');
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
 * Ensures minimum 6 pairs with KMA diversity, no maximum limit
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

        // Enhanced pair validation with detailed tracking
        const validation = {
            totalPairs: pairs.length,
            validPairs: 0,
            invalidPairs: 0,
            uniqueCities: new Set(),
            uniqueKMAs: new Set(),
            errors: []
        };

        monitor.log('info', `Starting pair validation for lane ${lane.id} (${validation.totalPairs} pairs)`);
        
        const usedCities = new Set();
        const validPairs = pairs.filter(pair => {
            try {
                // Structural validation
                if (!pair || typeof pair !== 'object') {
                    throw new Error('Invalid pair structure');
                }

                // Required field validation
                const required = {
                    pickup: {
                        city: pair.pickup?.city,
                        state: pair.pickup?.state || pair.pickup?.state_or_province,
                        kma: pair.pickup?.kma_code
                    },
                    delivery: {
                        city: pair.delivery?.city,
                        state: pair.delivery?.state || pair.delivery?.state_or_province,
                        kma: pair.delivery?.kma_code
                    }
                };

                // Validate all required fields
                Object.entries(required).forEach(([type, fields]) => {
                    Object.entries(fields).forEach(([field, value]) => {
                        if (!value) {
                            throw new Error(`Missing ${field} in ${type}`);
                        }
                    });
                });

                const pickupCity = required.pickup.city;
                const pickupState = required.pickup.state;
                const deliveryCity = required.delivery.city;
                const deliveryState = required.delivery.state;
            
            // Check for unique cities
            const pickupKey = `${pickupCity}-${pickupState}`;
            const deliveryKey = `${deliveryCity}-${deliveryState}`;
            
            if (usedCities.has(pickupKey) || usedCities.has(deliveryKey)) {
                monitor.log('debug', `Skipping duplicate city in lane ${lane.id}: ${pickupKey} or ${deliveryKey}`);
                return false;
            }
            
            // Mark these cities as used
            usedCities.add(pickupKey);
            usedCities.add(deliveryKey);
            if (!pair || typeof pair !== 'object') {
                monitor.log('warn', `Invalid pair structure for lane ${lane.id}:`, pair);
                return false;
            }
            
                // Check for duplicate cities
                // Generate unique keys for city pairs
                const cityKeys = {
                    pickup: `${pickupCity}-${pickupState}`,
                    delivery: `${deliveryCity}-${deliveryState}`
                };

                if (usedCities.has(cityKeys.pickup) || usedCities.has(cityKeys.delivery)) {
                    throw new Error(`Duplicate city detected: ${cityKeys.pickup} or ${cityKeys.delivery}`);
                }

                // Track validation stats
                usedCities.add(cityKeys.pickup);
                usedCities.add(cityKeys.delivery);
                validation.uniqueCities.add(cityKeys.pickup);
                validation.uniqueCities.add(cityKeys.delivery);
                validation.uniqueKMAs.add(required.pickup.kma);
                validation.uniqueKMAs.add(required.delivery.kma);
                
                validation.validPairs++;
                return true;

            } catch (error) {
                validation.invalidPairs++;
                validation.errors.push({
                    pair,
                    error: error.message
                });
                monitor.log('warn', `Invalid pair in lane ${lane.id}:`, error.message);
                return false;
            }
        });

        // Log detailed validation results
        monitor.log('info', `Pair validation complete for lane ${lane.id}:`, {
            total: validation.totalPairs,
            valid: validation.validPairs,
            invalid: validation.invalidPairs,
            uniqueCities: validation.uniqueCities.size,
            uniqueKMAs: validation.uniqueKMAs.size
        });
        
        if (validPairs.length < MIN_PAIRS_REQUIRED) {
            const error = new Error(
                `CRITICAL: Failed to generate minimum ${MIN_PAIRS_REQUIRED} valid pairs for lane ${lane.id}.\n` +
                `Found: ${validPairs.length} valid pairs (${validPairs.length * ROWS_PER_PAIR} rows).\n` +
                `Required: ${MIN_PAIRS_REQUIRED} pairs (${MIN_PAIRS_REQUIRED * ROWS_PER_PAIR} rows).`
            );
            
            error.details = {
                lane_id: lane.id,
                found_pairs: validPairs.length,
                found_rows: validPairs.length * ROWS_PER_PAIR,
                required_pairs: MIN_PAIRS_REQUIRED,
                required_rows: MIN_PAIRS_REQUIRED * ROWS_PER_PAIR,
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
        if (errorRows.length > 0 && rows.length >= MIN_PAIRS_REQUIRED * ROWS_PER_PAIR) {
            monitor.log('warn', `Generated minimum required rows despite ${errorRows.length} errors for lane ${lane.id}`);
        }
        
        // If we don't have enough rows after filtering errors, fail
        if (rows.length < MIN_PAIRS_REQUIRED * ROWS_PER_PAIR) {
            const error = new Error(
                `CRITICAL: Failed to generate minimum required rows after filtering errors for lane ${lane.id}.\n` +
                `Generated: ${rows.length} valid rows\n` +
                `Required: ${MIN_PAIRS_REQUIRED * ROWS_PER_PAIR} rows\n` +
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
  
  // PHASE 3 FIX: Atomic reference ID generation and storage
  // Use stored reference ID or generate new one consistently
  let uniqueRefId = lane.reference_id;
  
  // Check if we already generated one for this lane in this session
  if (generatedRefIds.has(lane.id)) {
    uniqueRefId = generatedRefIds.get(lane.id);
  } else if (!uniqueRefId || !/^RR\d{5}$/.test(uniqueRefId)) {
    // Generate reference ID from UUID consistently (same logic as recap system)
    const laneId = String(lane.id);
    
    // Extract numeric characters from UUID and create consistent reference ID
    const numericPart = laneId.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
    const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
    uniqueRefId = `RR${referenceNum}`;
  }
  
  // CRITICAL FIX: Ensure reference ID uniqueness within this CSV export ATOMICALLY
  let counter = 1;
  let candidateRefId = uniqueRefId;
  while (usedRefIds.has(candidateRefId)) {
    // Generate alternative unique reference ID
    const baseNum = parseInt(uniqueRefId.slice(2), 10);
    const newNum = String((baseNum + counter) % 100000).padStart(5, '0');
    candidateRefId = `RR${newNum}`;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 100000) {
      candidateRefId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
      break;
    }
  }
  
  // ATOMIC OPERATION: Store and mark as used simultaneously to prevent race conditions
  uniqueRefId = candidateRefId;
  generatedRefIds.set(lane.id, uniqueRefId);
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
  // Use the module-level MIN_PAIRS_REQUIRED constant

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 ROWSFROMPAIRS DEBUG: Lane ${lane.id}, preferFillTo10=${preferFillTo10}, MIN_PAIRS=${MIN_PAIRS_REQUIRED}`);
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

  // Track uniqueness state
  const state = {
    usedPickupCities: new Set([`${baseOrigin.city}-${baseOrigin.state}`]),
    usedDeliveryCities: new Set([`${baseDest.city}-${baseDest.state}`]),
    usedKmas: new Set([
      baseOrigin.kma_code,
      baseDest.kma_code
    ].filter(Boolean))
  };

  // First process the base pair
  const allPairs = [
    { pickup: baseOrigin, delivery: baseDest, isBase: true }
  ];
  
  // Process all remaining pairs to ensure uniqueness
  const generatedPairs = filteredPairs
    .map(pair => ({
      ...pair,
      pickupKey: `${pair.pickup.city}-${pair.pickup.state}`,
      deliveryKey: `${pair.delivery.city}-${pair.delivery.state}`,
      pickupKma: pair.pickup.kma_code,
      deliveryKma: pair.delivery.kma_code,
      score: pair.score || 0
    }))
    .sort((a, b) => b.score - a.score) // Sort by score first
    .filter(pair => {
      // Must have KMAs
      if (!pair.pickupKma || !pair.deliveryKma) return false;
      
      // No duplicate cities
      if (state.usedPickupCities.has(pair.pickupKey) || 
          state.usedDeliveryCities.has(pair.deliveryKey)) {
        return false;
      }
      
      // No duplicate KMAs
      if (state.usedKmas.has(pair.pickupKma) || 
          state.usedKmas.has(pair.deliveryKma)) {
        return false;  
      }
      
      // Track used values
      state.usedPickupCities.add(pair.pickupKey);
      state.usedDeliveryCities.add(pair.deliveryKey);
      state.usedKmas.add(pair.pickupKma);
      state.usedKmas.add(pair.deliveryKma);
      
      return true;
    });
    
  allPairs.push(...generatedPairs);
  
  // Validate minimum requirements
  console.log(`✅ Found ${allPairs.length} total pairs:`);
  console.log(`📍 Unique pickup cities: ${state.usedPickupCities.size}`);
  console.log(`🏢 Unique delivery cities: ${state.usedDeliveryCities.size}`);
  console.log(`🌐 Unique KMAs: ${state.usedKmas.size}`);
  
  if (allPairs.length < MIN_PAIRS_REQUIRED) {
    throw new Error(
      `Insufficient pairs: Found ${allPairs.length} unique pairs ` +
      `(minimum ${MIN_PAIRS_REQUIRED} required)`
    );
  }
  
  if (state.usedKmas.size < MIN_PAIRS_REQUIRED) {
    throw new Error(
      `Insufficient KMA diversity: Found ${state.usedKmas.size} unique KMAs ` +
      `(minimum ${MIN_PAIRS_REQUIRED} required)`
    );
  }
  
  return allPairs;
  
  // Validate KMA diversity
  const pickupKmas = new Set(finalPickupCrawls.map(p => p.pickup.kma_code));
  const deliveryKmas = new Set(finalDeliveryCrawls.map(p => p.delivery.kma_code));
  
  console.log(`📊 KMA Diversity Achievement:
  Base Pair: ${baseOrigin.city}, ${baseOrigin.state} -> ${baseDest.city}, ${baseDest.state}
  Pickup Crawls: ${finalPickupCrawls.length} pairs with ${pickupKmas.size} unique KMAs
  Delivery Crawls: ${finalDeliveryCrawls.length} pairs with ${deliveryKmas.size} unique KMAs`);
  
  // Combine all pairs in DAT-specified order
  const usePairs = [
    // First the base pair
    { pickup: baseOrigin, delivery: baseDest, isBase: true },
    // Then all pickup crawls
    ...finalPickupCrawls,
    // Then all delivery crawls
    ...finalDeliveryCrawls
  ];
  
  console.log(`📊 Final pairs for DAT CSV: ${usePairs.length} crawl pairs + 1 base = ${usePairs.length + 1} total pairs`);

  // Final validation: Ensure we have exactly 11 pairs (10 crawl + 1 base) for 22 rows
  if (usePairs.length !== REQUIRED_PAIRS - 1) { // -1 for base pair
    throw new Error(
      `CRITICAL: Invalid pair count for lane ${lane.id}. ` +
      `Need exactly ${REQUIRED_PAIRS - 1} crawl pairs for DAT CSV. ` +
      `Found: ${usePairs.length} pairs.`
    );
  }

  // Generate rows for each pair
  const rows = [];
  const contactMethods = contactVariants();

  // Process each pair
  for (const pair of allPairs) {
    // Create rows for each contact method
    for (const method of contactMethods) {
      rows.push(
        baseRowFrom(
          lane,
          pair.pickup,
          pair.delivery,
          method,
          usedRefIds,
          generatedRefIds
        )
      );
    }
  }

  // Validate final row count
  const expectedRows = allPairs.length * contactMethods.length;
  if (rows.length !== expectedRows) {
    throw new Error(
      `Row count mismatch: Generated ${rows.length} rows, ` +
      `expected ${expectedRows} (${allPairs.length} pairs × ${contactMethods.length} contact methods)`
    );
  }

  return rows;
}

// Validate required fields in a row
function validateRow(row, headers, rowIndex) {
  const requiredFields = headers.filter(h => h.endsWith('*'));
  const missing = requiredFields.filter(field => !row[field]);
  
  if (missing.length > 0) {
    const error = new Error(`Row ${rowIndex + 1} missing required fields: ${missing.join(', ')}`);
    error.rowIndex = rowIndex;
    error.missing = missing;
    monitor.log('error', 'Row validation failed:', error);
    throw error;
  }
  return true;
}

// Ensure and normalize field values
function ensureValue(value, field) {
  if (value == null) {
    if (field.endsWith('*')) {
      throw new Error(`Required field "${field}" is null/undefined`);
    }
    return '';
  }
  return String(value);
}

// Enhanced CSV generation with validation
export function toCsv(headers, rows) {
  monitor.startOperation('csv_generation', { rowCount: rows?.length });
  
  // Validate headers first
  assertHeadersOrder(headers);
  
  if (!Array.isArray(rows)) {
    const error = new Error('CSV rows must be an array');
    monitor.log('error', 'Invalid rows structure:', error);
    throw error;
  }

  monitor.log('info', `Processing ${rows.length} rows for CSV generation`);

  // Escape & normalize values
  const esc = (v) => {
    const s = String(v);
    if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push(headers.join(','));
  
  let validRows = 0;
  for (const [i, row] of rows.entries()) {
    try {
      // Validate row structure
      validateRow(row, headers, i);
      
      // Generate CSV line with value validation
      const line = headers.map(h => esc(ensureValue(row[h], h))).join(',');
      lines.push(line);
      validRows++;
      
    } catch (e) {
      monitor.log('error', `Row ${i + 1} failed validation:`, e);
      throw new Error(`Row ${i + 1} validation failed: ${e.message}`);
    }
  }

  monitor.log('info', `✅ Successfully generated CSV with ${validRows} valid rows`);
  return lines.join('\r\n');
}

export function chunkRows(allRows, max = 499) {
  const chunks = [];
  for (let i = 0; i < allRows.length; i += max) {
    chunks.push(allRows.slice(i, i + max));
  }
  return chunks;
}
