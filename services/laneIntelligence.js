// services/laneIntelligence.js
import { z } from 'zod';
import supabase from '../utils/supabaseClient';
import { safeGetCurrentToken } from '../lib/auth/safeAuth';
import { 
  LaneSchema, 
  OptionsPayloadSchema, 
  OptionsResponseSchema,
  validateLane,
  validateOptionsPayload
} from '../components/post-options/ZodValidation';
import { dedupeFetch, allowAction } from '../lib/loopGuard';

// Additional validation schemas
const KMAPairingSchema = z.object({
  origin_kma: z.string(),
  destination_kma: z.string(),
  distance: z.number().positive(), // Changed from distance_miles to distance
  frequency: z.number().int().positive().optional()
});

const LaneResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.any().optional(),
  message: z.string().optional()
});

const BatchPayloadSchema = z.array(OptionsPayloadSchema);

// Log levels for the service
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Service logger that writes to console and optionally to Supabase
 * @param {string} message - Message to log
 * @param {any} data - Data to log (optional)
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {boolean} writeToDb - Whether to write the log to Supabase
 */
async function logMessage(message, data = null, level = LOG_LEVELS.INFO, writeToDb = false) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    data: data ? JSON.stringify(data) : null
  };
  
  // Always log to console with appropriate level
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(`[LANE-INTELLIGENCE] ${message}`, data);
      break;
    case LOG_LEVELS.WARN:
      console.warn(`[LANE-INTELLIGENCE] ${message}`, data);
      break;
    case LOG_LEVELS.DEBUG:
      console.debug(`[LANE-INTELLIGENCE] ${message}`, data);
      break;
    case LOG_LEVELS.INFO:
    default:
      console.log(`[LANE-INTELLIGENCE] ${message}`, data);
  }
  
  // Write to Supabase if enabled
  if (writeToDb) {
    try {
      const { error } = await supabase
        .from('debug_logs')
        .insert({
          service: 'lane-intelligence',
          level,
          message,
          data: logEntry.data,
          created_at: timestamp
        });
      
      if (error) {
        console.error('Failed to write log to database:', error);
      }
    } catch (err) {
      console.error('Error writing log to database:', err);
    }
  }
}

/**
 * Generates unique KMA pairs for origin/destination within distance range
 * @param {Object} options - Options for pair generation
 * @param {number} options.minDistance - Minimum distance in miles (default: 75)
 * @param {number} options.maxDistance - Maximum distance in miles (default: 100)
 * @param {Array<string>} options.excludedKmaCodes - KMA codes to exclude
 * @param {number} options.limit - Maximum number of pairs to return
 * @returns {Promise<Array<Object>>} - Array of KMA pairs
 */
export async function generateLanePairs({
  minDistance = 75,
  maxDistance = 100,
  excludedKmaCodes = [],
  limit = 50
} = {}) {
  try {
    logMessage(`Generating KMA pairs (${minDistance}-${maxDistance} miles)`, { minDistance, maxDistance, limit });
    
    // Generate KMA pairs with distance between min and max
    const { data, error } = await supabase
      .rpc('get_kma_pairs_in_distance_range', {
        min_distance: minDistance,
        max_distance: maxDistance,
        exclude_kmas: excludedKmaCodes,
        result_limit: limit
      });
    
    if (error) {
      logMessage('Error generating KMA pairs', error, LOG_LEVELS.ERROR, true);
      return { success: false, error, message: 'Failed to generate KMA pairs' };
    }
    
    // Validate the results
    const validPairs = [];
    for (const pair of data || []) {
      const validation = KMAPairingSchema.safeParse(pair);
      if (validation.success) {
        validPairs.push(validation.data);
      } else {
        logMessage('Invalid KMA pair', { pair, errors: validation.error.format() }, LOG_LEVELS.WARN);
      }
    }
    
    logMessage(`Generated ${validPairs.length} valid KMA pairs`);
    return { 
      success: true, 
      data: validPairs,
      message: `Generated ${validPairs.length} KMA pairs`
    };
  } catch (error) {
    logMessage('Error in generateLanePairs', error, LOG_LEVELS.ERROR, true);
    return { success: false, error, message: 'Exception in KMA pair generation' };
  }
}

/**
 * Gets cities within a KMA code for origin or destination
 * @param {string} kmaCode - KMA code to find cities for
 * @param {number} limit - Maximum number of cities to return
 * @returns {Promise<Array<Object>>} - Array of cities
 */
export async function getCitiesForKma(kmaCode, limit = 10) {
  try {
    logMessage(`Getting cities for KMA ${kmaCode}`);
    
    const { data, error } = await supabase
      .from('cities')
      .select('id, city, state_or_province, zip, kma_code, latitude, longitude')
      .eq('kma_code', kmaCode)
      .limit(limit);
    
    if (error) {
      logMessage(`Error getting cities for KMA ${kmaCode}`, error, LOG_LEVELS.ERROR);
      return { success: false, error, message: `Failed to get cities for KMA ${kmaCode}` };
    }
    
    logMessage(`Found ${data?.length || 0} cities for KMA ${kmaCode}`);
    return { success: true, data, message: `Found ${data?.length || 0} cities for KMA ${kmaCode}` };
  } catch (error) {
    logMessage(`Error in getCitiesForKma for ${kmaCode}`, error, LOG_LEVELS.ERROR);
    return { success: false, error, message: `Exception getting cities for KMA ${kmaCode}` };
  }
}

/**
 * Validates a lane against the Lane schema with loop protection
 * @param {Object} lane - Lane object to validate
 * @returns {Object} - Validation result
 */
export function validateLaneData(lane) {
  // Prevent re-entrant calls for the same lane
  const actionId = `validate-lane-${lane?.id || 'unknown'}`;
  
  if (!allowAction(actionId, 500)) {
    logMessage(`Skipping duplicate validation for lane ${lane?.id}`, null, LOG_LEVELS.DEBUG);
    return { success: true, data: lane, cached: true };
  }
  
  try {
    const result = validateLane(lane);
    if (!result.success) {
      logMessage('Lane validation failed', result.error, LOG_LEVELS.WARN);
    } else {
      console.log("[LaneIntelligence] Validation done, no re-fetch trigger");
    }
    return result;
  } catch (error) {
    logMessage('Exception in validateLaneData', error, LOG_LEVELS.ERROR);
    return { success: false, error, message: 'Exception in lane validation' };
  }
}

/**
 * Prepares a payload for the post-options API
 * @param {Object} lane - Lane data
 * @returns {Object} - Prepared payload or error
 */
export function prepareOptionsPayload(lane) {
  try {
    // Validate the lane first
    const laneValidation = validateLaneData(lane);
    if (!laneValidation.success) {
      return laneValidation;
    }
    
    // Extract the required fields from the lane and ensure consistent naming
    // Priority: destination_city over dest_city (dest_city might be null in database)
    const payload = {
      laneId: lane.id,
      originCity: lane.origin_city || '',
      originState: lane.origin_state || '',
      destinationCity: lane.destination_city || lane.destinationCity || lane.dest_city || '',
      destinationState: lane.destination_state || lane.destinationState || lane.dest_state || '',
      equipmentCode: lane.equipment_code || lane.equipment || '',
    };
    
    // Additional validation to ensure no empty strings
    if (!payload.laneId || payload.laneId.trim() === '') {
      logMessage('Missing lane ID in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing lane ID', message: 'Lane ID is required' };
    }
    
    if (!payload.originCity || payload.originCity.trim() === '') {
      logMessage('Missing origin city in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing origin city', message: 'Origin city is required' };
    }
    
    if (!payload.originState || payload.originState.trim() === '') {
      logMessage('Missing origin state in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing origin state', message: 'Origin state is required' };
    }
    
    if (!payload.destinationCity || payload.destinationCity.trim() === '') {
      logMessage('Missing destination city in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing destination city', message: 'Destination city is required' };
    }
    
    if (!payload.destinationState || payload.destinationState.trim() === '') {
      logMessage('Missing destination state in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing destination state', message: 'Destination state is required' };
    }
    
    if (!payload.equipmentCode || payload.equipmentCode.trim() === '') {
      logMessage('Missing equipment code in payload', lane, LOG_LEVELS.WARN);
      return { success: false, error: 'Missing equipment code', message: 'Equipment code is required' };
    }
    
    // Validate the payload
    const payloadValidation = validateOptionsPayload(payload);
    if (!payloadValidation.success) {
      logMessage('Options payload validation failed', payloadValidation.error, LOG_LEVELS.WARN);
      return payloadValidation;
    }
    
    return { success: true, data: payloadValidation.data };
  } catch (error) {
    logMessage('Exception in prepareOptionsPayload', error, LOG_LEVELS.ERROR);
    return { success: false, error, message: 'Exception preparing options payload' };
  }
}

/**
 * Submit options for a single lane with loop protection
 * @param {Object} lane - Lane to submit options for
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} - Submission result
 */
export async function submitOptions(lane, accessToken = null) {
  // Generate a unique ID for this specific lane submission
  const fetchId = `submit-options-${lane?.id || 'unknown'}-${Date.now()}`;
  
  try {
    logMessage(`Submitting options for lane ${lane.id}`);
    
    // Prepare the payload
    const payloadResult = prepareOptionsPayload(lane);
    if (!payloadResult.success) {
      return payloadResult;
    }
    
    const payload = payloadResult.data;
    
    // Get authentication token if not provided
    let token = accessToken;
    if (!token) {
      token = await safeGetCurrentToken(supabase);
      if (!token) {
        logMessage('Authentication required for submitOptions', null, LOG_LEVELS.ERROR);
        return { success: false, error: 'Authentication required' };
      }
    }
    
    // Ensure payload is correctly formatted according to the API schema
    const formattedPayload = {
      laneId: payload.laneId,
      originCity: payload.originCity,
      originState: payload.originState,
      destinationCity: payload.destinationCity,
      destinationState: payload.destinationState,
      equipmentCode: payload.equipmentCode
    };
    
    logMessage(`Submitting options with payload:`, formattedPayload, LOG_LEVELS.DEBUG);
    
    // Make API call to generate options with deduplication protection
    let fetchResult;
    try {
      fetchResult = await dedupeFetch(
        '/api/post-options', 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(formattedPayload),
        },
        fetchId, // Unique identifier for this fetch
        30000,   // 30 second timeout
        `lane-${lane.id}` // Cache key for deduplication
      );
    } catch (fetchError) {
      logMessage(`Network error calling /api/post-options: ${fetchError.message}`, null, LOG_LEVELS.ERROR);
      return { success: false, error: `Network error: ${fetchError.message}` };
    }
    
    // Check if we got a cached response or an error from dedupeFetch
    if (fetchResult?.cached) {
      logMessage(`Using cached options result for lane ${lane.id}`, null, LOG_LEVELS.INFO);
      return fetchResult.data;
    }
    
    if (fetchResult?.error) {
      logMessage(`Fetch error: ${fetchResult.error}`, null, LOG_LEVELS.ERROR);
      return { success: false, error: fetchResult.error };
    }
    
    // Process the real response - add null check
    const response = fetchResult?.response;
    
    if (!response) {
      logMessage(`[LANE-INTELLIGENCE] Bad response: Undefined response from API`, null, LOG_LEVELS.ERROR);
      return { success: false, error: 'Undefined response from API' };
    }
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      logMessage(`[LANE-INTELLIGENCE] Bad response: ${text || response.status}`, null, LOG_LEVELS.ERROR);
      return { success: false, error: `API error: ${response.status}`, details: text };
    }
    
    const data = await response.json();
    
    // Validate the response
    const responseValidation = OptionsResponseSchema.safeParse(data);
    if (!responseValidation.success) {
      logMessage('Invalid API response', { data, errors: responseValidation.error.format() }, LOG_LEVELS.WARN);
      return { success: false, error: 'Invalid API response', details: responseValidation.error.format() };
    }
    
    // Store successful result for future deduplication
    const result = { success: true, data: responseValidation.data };
    
    logMessage(`Options generated successfully for lane ${lane.id}`);
    return result;
  } catch (error) {
    logMessage(`Error in submitOptions for lane ${lane?.id}`, error, LOG_LEVELS.ERROR);
    return { success: false, error, message: `Exception submitting options for lane ${lane?.id}` };
  }
}

/**
 * Submit options for multiple lanes in batch with loop protection
 * @param {Array<Object>} lanes - Lanes to submit options for
 * @param {Object} options - Options for batch submission
 * @param {boolean} options.parallel - Whether to submit in parallel
 * @param {Function} options.onProgress - Progress callback (index, total, result)
 * @returns {Promise<Object>} - Batch submission results
 */
export async function submitOptionsBatch(lanes, { 
  parallel = false, 
  onProgress = null 
} = {}) {
  // Generate unique batch ID to prevent concurrent identical batches
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Check if we're already processing a similar batch
  if (!allowAction(`submitOptionsBatch-${lanes.length}`, 2000)) {
    logMessage('Skipping duplicate batch submission', null, LOG_LEVELS.WARN);
    return { 
      success: false, 
      cached: true,
      error: 'Duplicate batch submission detected',
      message: 'Another similar batch is already being processed'
    };
  }
  
  try {
    if (!lanes || !Array.isArray(lanes) || lanes.length === 0) {
      logMessage('No lanes provided for batch submission', null, LOG_LEVELS.WARN);
      return { success: false, error: 'No lanes provided' };
    }
    
    logMessage(`Batch submitting options for ${lanes.length} lanes (parallel: ${parallel}, batchId: ${batchId})`);
    
    // Get authentication token once for all requests
    const token = await safeGetCurrentToken(supabase);
    if (!token) {
      logMessage('Authentication required for batch submission', null, LOG_LEVELS.ERROR);
      return { success: false, error: 'Authentication required' };
    }
    
    const results = [];
    const total = lanes.length;
    
    // Limit parallel processing to prevent overloading the API
    const maxConcurrent = parallel ? Math.min(lanes.length, 5) : 1;
    let activeRequests = 0;
    let nextIndex = 0;
    
    if (parallel) {
      // Use controlled concurrency for parallel execution
      const processBatch = async () => {
        const processingPromises = [];
        
        // Process lanes in batches with controlled concurrency
        while (nextIndex < total && activeRequests < maxConcurrent) {
          const index = nextIndex++;
          activeRequests++;
          
          const processPromise = submitOptions(lanes[index], token)
            .then(result => {
              activeRequests--;
              onProgress?.(index, total, result);
              return { index, result };
            })
            .catch(error => {
              activeRequests--;
              logMessage(`Error processing lane at index ${index}`, error, LOG_LEVELS.ERROR);
              return { 
                index, 
                result: { 
                  success: false, 
                  error: error.message || 'Unknown error', 
                  message: `Failed to process lane at index ${index}` 
                } 
              };
            });
          
          processingPromises.push(processPromise);
        }
        
        return Promise.all(processingPromises);
      };
      
      // Process all lanes with controlled concurrency
      const allResults = [];
      while (nextIndex < total) {
        const batchResults = await processBatch();
        allResults.push(...batchResults);
      }
      
      // Sort results by index to maintain order
      allResults.sort((a, b) => a.index - b.index);
      results.push(...allResults.map(item => item.result));
    } else {
      // Submit sequentially
      for (let i = 0; i < lanes.length; i++) {
        // Check for abort signal after each iteration
        if (!allowAction(`continue-batch-${batchId}`, 0)) {
          logMessage('Batch processing aborted', null, LOG_LEVELS.WARN);
          break;
        }
        
        const result = await submitOptions(lanes[i], token);
        results.push(result);
        onProgress?.(i, total, result);
      }
    }
    
    // Calculate success rate
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / total) * 100;
    
    logMessage(`Batch submission complete: ${successCount}/${total} successful (${successRate.toFixed(1)}%)`);
    return { 
      success: successCount > 0, 
      data: results,
      successCount,
      totalCount: total,
      successRate: successRate.toFixed(1) + '%',
      message: `Completed with ${successCount}/${total} successful (${successRate.toFixed(1)}%)`
    };
  } catch (error) {
    logMessage('Error in submitOptionsBatch', error, LOG_LEVELS.ERROR, true);
    return { success: false, error, message: 'Exception in batch option submission' };
  }
}

/**
 * Calculate or retrieve rate data for a lane
 * @param {Object} lane - Lane to calculate rates for
 * @returns {Promise<Object>} - Rate data
 */
export async function getLaneRates(lane) {
  try {
    logMessage(`Getting rates for lane ${lane.id}`);
    
    // Validate the lane
    const laneValidation = validateLaneData(lane);
    if (!laneValidation.success) {
      return laneValidation;
    }
    
    // Try to get cached rate data first
    const { data: cachedRates, error: cacheError } = await supabase
      .from('lane_rates')
      .select('*')
      .eq('lane_id', lane.id)
      .single();
    
    if (!cacheError && cachedRates) {
      logMessage(`Found cached rates for lane ${lane.id}`);
      return { success: true, data: cachedRates, source: 'cache' };
    }
    
    // Calculate fresh rate from DAT rate API or market data
    const { data: marketData, error: marketError } = await supabase
      .from('dat_maps')
      .select('map_data')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (marketError || !marketData) {
      logMessage('Failed to fetch market data for rate calculation', marketError, LOG_LEVELS.ERROR);
      return { success: false, error: marketError, message: 'Failed to fetch market data' };
    }
    
    // Simple calculation based on weight and distance (placeholder for real logic)
    // In a real implementation, this would use the market data and lane parameters
    const weight = lane.weight_lbs || 40000;
    const distance = 500; // This would normally be calculated from origin/destination
    
    // Calculate rate based on market factors (simplified example)
    const baseRate = (weight / 1000) * 0.65;
    const mileRate = distance * 3.75;
    const calculatedRate = baseRate + mileRate;
    
    const rateData = {
      lane_id: lane.id,
      rate_per_mile: (calculatedRate / distance).toFixed(2),
      total_rate: calculatedRate.toFixed(2),
      currency: 'USD',
      calculated_at: new Date().toISOString(),
      market_factors: {
        market_tightness: Math.random().toFixed(2),
        seasonal_factor: 1.0 + (Math.random() * 0.2),
        fuel_surcharge: 0.45
      }
    };
    
    // Cache the rate data
    try {
      await supabase
        .from('lane_rates')
        .upsert({
          ...rateData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    } catch (cacheErr) {
      logMessage('Failed to cache rate data', cacheErr, LOG_LEVELS.WARN);
    }
    
    logMessage(`Calculated rates for lane ${lane.id}`);
    return { success: true, data: rateData, source: 'calculated' };
  } catch (error) {
    logMessage(`Error in getLaneRates for lane ${lane?.id}`, error, LOG_LEVELS.ERROR);
    return { success: false, error, message: `Exception calculating rates for lane ${lane?.id}` };
  }
}

/**
 * Complete lane intelligence pipeline: generate pairs, get cities, prepare payloads
 * @param {Object} options - Pipeline options
 * @returns {Promise<Object>} - Pipeline results
 */
export async function runLaneIntelligencePipeline({
  minDistance = 75,
  maxDistance = 100,
  pairLimit = 20,
  citiesPerKma = 5,
  excludedKmas = [],
  equipmentCode = 'V',
  weight = 40000
} = {}) {
  try {
    logMessage('Starting lane intelligence pipeline', { 
      minDistance, maxDistance, pairLimit, citiesPerKma 
    });
    
    // Step 1: Generate KMA pairs
    const pairsResult = await generateLanePairs({
      minDistance,
      maxDistance,
      excludedKmaCodes: excludedKmas,
      limit: pairLimit
    });
    
    if (!pairsResult.success || !pairsResult.data) {
      return pairsResult;
    }
    
    const pairs = pairsResult.data;
    logMessage(`Generated ${pairs.length} KMA pairs`);
    
    // Step 2: For each pair, get cities in both KMAs
    const laneOptions = [];
    
    for (const pair of pairs) {
      const originResult = await getCitiesForKma(pair.origin_kma, citiesPerKma);
      const destResult = await getCitiesForKma(pair.destination_kma, citiesPerKma);
      
      if (!originResult.success || !destResult.success) {
        logMessage('Failed to get cities for KMA pair', {
          pair,
          originSuccess: originResult.success,
          destSuccess: destResult.success
        }, LOG_LEVELS.WARN);
        continue;
      }
      
      const originCities = originResult.data;
      const destCities = destResult.data;
      
      if (!originCities.length || !destCities.length) {
        logMessage('No cities found for KMA pair', {
          pair,
          originCount: originCities.length,
          destCount: destCities.length
        }, LOG_LEVELS.WARN);
        continue;
      }
      
      // Step 3: Create lane options from city combinations
      for (const origin of originCities) {
        for (const dest of destCities) {
          laneOptions.push({
            origin_city: origin.city,
            origin_state: origin.state_or_province,
            origin_zip: origin.zip,
            dest_city: dest.city,
            dest_state: dest.state_or_province,
            dest_zip: dest.zip,
            equipment_code: equipmentCode,
            weight_lbs: weight,
            // These fields would be filled by the API
            lane_status: 'pending',
            distance: pair.distance_miles || pair.distance, // Support both field names during transition
            kma_pair: `${pair.origin_kma}-${pair.destination_kma}`
          });
        }
      }
    }
    
    logMessage(`Created ${laneOptions.length} lane options`);
    return {
      success: true,
      data: laneOptions,
      count: laneOptions.length,
      message: `Generated ${laneOptions.length} lane options from ${pairs.length} KMA pairs`
    };
  } catch (error) {
    logMessage('Error in runLaneIntelligencePipeline', error, LOG_LEVELS.ERROR, true);
    return { success: false, error, message: 'Exception in lane intelligence pipeline' };
  }
}

export default {
  generateLanePairs,
  getCitiesForKma,
  validateLaneData,
  prepareOptionsPayload,
  submitOptions,
  submitOptionsBatch,
  getLaneRates,
  runLaneIntelligencePipeline
};