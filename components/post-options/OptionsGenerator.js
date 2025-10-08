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
    const result = await submitOptions(lane);
    
    if (!result.success) {
      console.error('Failed to generate options:', result.error);
      onError?.(new Error(result.message || 'Failed to generate options'));
      return result;
    }
    
    console.log('Options generated successfully:', result.data);
    onSuccess?.(result.data);
    return result;
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
    
    // Use the service's batch submission function directly
    const result = await import('../../services/laneIntelligence')
      .then(({ submitOptionsBatch }) => 
        submitOptionsBatch(lanes, { parallel, onProgress }));
    
    onComplete?.(result);
    return result;
  } catch (error) {
    console.error('Error in generateOptionsBatch:', error);
    return { success: false, error: error.message };
  }
}