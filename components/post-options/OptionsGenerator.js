// components/post-options/OptionsGenerator.js
import { submitOptions, prepareOptionsPayload } from '../../services/laneIntelligence';

/**
 * Generates options for a lane by calling the post-options API through the laneIntelligence service
 * 
 * @param {Object} lane - The lane object to generate options for
 * @param {Function} onSuccess - Callback on successful generation
 * @param {Function} onError - Callback on error
 * @param {Object} schema - Optional Zod schema for validation
 * @returns {Promise<Object>} - The response from the API
 */
export async function generateOptions(lane, onSuccess, onError, schema = null) {
  try {
    if (!lane || !lane.id) {
      const error = new Error('Invalid lane data: missing lane ID');
      console.error(error);
      onError?.(error);
      return { success: false, error: 'Missing lane ID' };
    }
    
    // Use the laneIntelligence service to submit options
    let result;
    try {
      result = await submitOptions(lane);
      
      if (!result) {
        console.error('[OptionsGenerator] No result returned from submitOptions');
        onError?.(new Error('No result returned from API'));
        return { success: false, error: 'No result returned from API' };
      }
      
      if (!result.success) {
        console.error('[OptionsGenerator] Failed to generate options:', result.error);
        onError?.(new Error(result.message || 'Failed to generate options'));
        return result;
      }
      
      console.log('[OptionsGenerator] Options generated successfully:', result.data);
      if (result.data) {
        onSuccess?.(result.data);
        return result; // Return the full result with data
      } else {
        console.warn('[OptionsGenerator] Success reported but no data returned');
        onSuccess?.({});
        return result;
      }
      return result;
    } catch (apiError) {
      console.error('[OptionsGenerator] API error in submitOptions:', apiError);
      onError?.(apiError);
      return { success: false, error: apiError.message || 'API call failed' };
    }
  } catch (error) {
    console.error('Error in generateOptions:', error);
    onError?.(error);
    return { success: false, error: error.message };
  }
}

/**
 * Generates options for multiple lanes in parallel or sequence
 * 
 * @param {Array<Object>} lanes - Lane objects to generate options for
 * @param {Object} options - Options for batch generation
 * @param {boolean} options.parallel - Whether to generate in parallel
 * @param {Function} options.onProgress - Progress callback
 * @param {Function} options.onComplete - Completion callback
 * @returns {Promise<Object>} - The batch generation results
 */
export async function generateOptionsBatch(lanes, { 
  parallel = false, 
  onProgress = null,
  onComplete = null 
} = {}) {
  try {
    if (!lanes || !Array.isArray(lanes) || lanes.length === 0) {
      const error = new Error('No lanes provided for batch generation');
      console.error(error);
      return { success: false, error: error.message };
    }
    
    // Avoid dynamic imports during render by using a pre-loaded module
    // Import the module at the top level instead
    let laneIntelligence;
    let submitOptionsBatch;
    
    try {
      // Use dynamic import but only in this async function context
      laneIntelligence = await import('../../services/laneIntelligence');
      
      if (!laneIntelligence) {
        console.error('[OptionsGenerator] Failed to import laneIntelligence module');
        return { success: false, error: 'Failed to load required modules' };
      }
      
      submitOptionsBatch = laneIntelligence.submitOptionsBatch;
      
      if (!submitOptionsBatch || typeof submitOptionsBatch !== 'function') {
        console.error('[OptionsGenerator] submitOptionsBatch function not found in module');
        return { success: false, error: 'Required function not found in module' };
      }
    } catch (importError) {
      console.error('[OptionsGenerator] Failed to load lane intelligence service:', importError);
      return { success: false, error: `Failed to load required modules: ${importError.message}` };
    }
    
    let result;
    try {
      result = await submitOptionsBatch(lanes, { parallel, onProgress });
    } catch (batchError) {
      console.error('[OptionsGenerator] Error executing submitOptionsBatch:', batchError);
      return { success: false, error: `Batch processing error: ${batchError.message}` };
    }
    
    if (!result) {
      console.error('[OptionsGenerator] No result returned from submitOptionsBatch');
      return { success: false, error: 'No result returned from batch processing' };
    }
    
    onComplete?.(result);
    return result;
  } catch (error) {
    console.error('Error in generateOptionsBatch:', error);
    return { success: false, error: error.message };
  }
}