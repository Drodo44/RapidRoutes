// components/post-options/OptionsGenerator.js
import { safeGetCurrentToken } from '../../lib/auth/safeAuth';
import supabase from '../../utils/supabaseClient';

/**
 * Generates options for a lane by calling the post-options API
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
    
    // Extract the required fields from the lane
    const payload = {
      laneId: lane.id,
      originCity: lane.origin_city || '',
      originState: lane.origin_state || '',
      destinationCity: lane.destination_city || lane.dest_city || '',
      destinationState: lane.destination_state || lane.dest_state || '',
      equipmentCode: lane.equipment_code || '',
    };

    // Validate with schema if provided
    if (schema) {
      const validation = schema.safeParse(payload);
      if (!validation.success) {
        const error = new Error(`Validation failed: ${JSON.stringify(validation.error.format())}`);
        console.error('Validation error:', validation.error);
        onError?.(error);
        return { success: false, error: 'Validation failed', details: validation.error.format() };
      }
    }

    // Get authentication token
    const accessToken = await safeGetCurrentToken(supabase);
    if (!accessToken) {
      const error = new Error('Authentication required');
      console.error('Missing access token when posting options');
      onError?.(error);
      return { success: false, error: 'Authentication required' };
    }

    console.log(`Generating options for lane ${payload.laneId}...`);

    // Make API call to generate options
    const response = await fetch('/api/post-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const error = new Error(`API error: ${text || response.status}`);
      console.error('Failed to generate options:', text || response.status);
      onError?.(error);
      return { success: false, error: `API error: ${response.status}`, details: text };
    }

    const data = await response.json();
    console.log('Options generated successfully:', data);
    onSuccess?.(data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in generateOptions:', error);
    onError?.(error);
    return { success: false, error: error.message };
  }
}