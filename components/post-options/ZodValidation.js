// components/post-options/ZodValidation.js
import { z } from 'zod';

/**
 * Enhanced Zod schema for validating lane data with better handling of edge cases
 */
export const LaneSchema = z.object({
  id: z.string().uuid({ message: 'Invalid lane ID format' }).optional(),
  origin_city: z.string().min(1, { message: 'Origin city is required' }),
  origin_state: z.string().min(2, { message: 'Origin state is required (2-letter code)' }).max(2),
  origin_zip: z.union([
    z.string(),
    z.number().transform(n => String(n)),
    z.null(),
    z.undefined()
  ]).optional(),
  destination_city: z.union([
    z.string().min(1, { message: 'Destination city is required' }),
    z.literal('').transform(() => null).optional(),
    z.null(),
    z.undefined()
  ]).optional(),
  dest_city: z.union([
    z.string().min(1, { message: 'Destination city is required' }),
    z.literal('').transform(() => null).optional(),
    z.null(),
    z.undefined()
  ]).optional(),
  destination_state: z.union([
    z.string().min(2, { message: 'Destination state is required (2-letter code)' }).max(2),
    z.literal('').transform(() => null).optional(),
    z.null(),
    z.undefined()
  ]).optional(),
  dest_state: z.union([
    z.string().min(2, { message: 'Destination state is required (2-letter code)' }).max(2),
    z.literal('').transform(() => null).optional(),
    z.null(),
    z.undefined()
  ]).optional(),
  dest_zip: z.union([
    z.string(),
    z.number().transform(n => String(n)),
    z.null(),
    z.undefined()
  ]).optional(),
  equipment_code: z.string().min(1, { message: 'Equipment code is required' }),
  weight_lbs: z.union([
    z.number(),
    z.string().transform(s => {
      const parsed = parseFloat(s);
      return isNaN(parsed) ? null : parsed;
    }),
    z.null(),
    z.undefined()
  ]).optional(),
  length_ft: z.union([
    z.number(),
    z.string().transform(s => {
      const parsed = parseFloat(s);
      return isNaN(parsed) ? null : parsed;
    }),
    z.null(),
    z.undefined()
  ]).optional(),
  lane_status: z.union([
    z.string(),
    z.null(),
    z.undefined()
  ]).default('current'),
  created_at: z.union([
    z.string(),
    z.date().transform(d => d.toISOString()),
    z.null(),
    z.undefined()
  ]).optional(),
  updated_at: z.union([
    z.string(),
    z.date().transform(d => d.toISOString()),
    z.null(),
    z.undefined()
  ]).optional(),
}).transform((data) => {
  // Normalize destination fields regardless of naming convention (snake_case or camelCase)
  return {
    ...data,
    destination_city: data.destination_city || data.dest_city || null,
    destination_state: data.destination_state || data.dest_state || null,
    // Add fallbacks for all potential field inconsistencies
    origin_zip: data.origin_zip || data.originZip || null,
    dest_zip: data.dest_zip || data.destination_zip || data.destZip || data.destinationZip || null,
    created_at: data.created_at || new Date().toISOString(),
    // Ensure weight and length are numbers or null
    weight_lbs: typeof data.weight_lbs === 'number' ? data.weight_lbs : 
                (data.weight_lbs ? parseFloat(data.weight_lbs) : null),
    length_ft: typeof data.length_ft === 'number' ? data.length_ft : 
               (data.length_ft ? parseFloat(data.length_ft) : null)
  };
});

/**
 * Enhanced Zod schema for validating post-options API payload
 * with better handling of edge cases and field naming variants
 */
export const OptionsPayloadSchema = z.object({
  // Accept both laneId and lane_id formats
  laneId: z.union([
    z.string().uuid({ message: 'Invalid lane ID format' }),
    z.string().min(1, { message: 'Lane ID is required' }), // For non-UUID IDs
  ]).or(z.literal('new')), // Allow 'new' for new lane creation
  
  // Accept both camelCase and snake_case variants for origin city
  originCity: z.union([
    z.string().min(1, { message: 'Origin city is required' }),
    z.literal('').transform(() => null)
  ]),
  origin_city: z.string().min(1).optional(),
  
  // Accept both camelCase and snake_case variants for origin state
  originState: z.union([
    z.string().min(2, { message: 'Origin state is required (2-letter code)' }).max(2),
    z.literal('').transform(() => null)
  ]),
  origin_state: z.string().min(2).max(2).optional(),
  
  // Accept both camelCase and snake_case variants for destination city
  destinationCity: z.union([
    z.string().min(1, { message: 'Destination city is required' }),
    z.literal('').transform(() => null)
  ]),
  destination_city: z.string().min(1).optional(),
  dest_city: z.string().min(1).optional(),
  
  // Accept both camelCase and snake_case variants for destination state
  destinationState: z.union([
    z.string().min(2, { message: 'Destination state is required (2-letter code)' }).max(2),
    z.literal('').transform(() => null)
  ]),
  destination_state: z.string().min(2).max(2).optional(),
  dest_state: z.string().min(2).max(2).optional(),
  
  // Accept both camelCase and snake_case variants for equipment code
  equipmentCode: z.union([
    z.string().min(1, { message: 'Equipment code is required' }),
    z.literal('').transform(() => null)
  ]),
  equipment_code: z.string().min(1).optional(),
})
.transform((data) => {
  // Normalize the data to ensure we have consistent field names
  return {
    laneId: data.laneId || data.lane_id || 'new',
    originCity: data.originCity || data.origin_city,
    originState: data.originState || data.origin_state,
    destinationCity: data.destinationCity || data.destination_city || data.dest_city,
    destinationState: data.destinationState || data.destination_state || data.dest_state,
    equipmentCode: data.equipmentCode || data.equipment_code,
  };
});

/**
 * Enhanced Zod schema for validating options response
 * with better handling of edge cases and error scenarios
 */
export const OptionsResponseSchema = z.union([
  // Success response schema
  z.object({
    ok: z.boolean(),
    laneId: z.union([
      z.string().uuid(),
      z.string().min(1),
      z.null(),
      z.undefined()
    ]).optional(),
    origin: z.object({
      city: z.string(),
      state: z.string(),
      options: z.array(z.object({
        id: z.string(),
        city: z.string(),
        state: z.string(),
        distance: z.number().or(z.string().transform(s => parseFloat(s))),
        kma_code: z.string().optional().nullable()
      })).optional().nullable()
    }).optional().nullable(),
    destination: z.object({
      city: z.string(),
      state: z.string(),
      options: z.array(z.object({
        id: z.string(),
        city: z.string(),
        state: z.string(),
        distance: z.number().or(z.string().transform(s => parseFloat(s))),
        kma_code: z.string().optional().nullable()
      })).optional().nullable()
    }).optional().nullable(),
    // Handle legacy field names
    originOptions: z.array(z.any()).optional().nullable(),
    destOptions: z.array(z.any()).optional().nullable(),
    error: z.string().optional().nullable()
  }),
  
  // Error response schema
  z.object({
    ok: z.literal(false),
    error: z.string()
  }),
  
  // Minimal error schema
  z.object({
    error: z.string()
  }),
  
  // Empty response fallback (in case of failed responses)
  z.object({}).transform(() => ({ ok: false, error: 'Empty response received' }))
])
.transform(data => {
  // Normalize response format
  return {
    ok: data.ok ?? false,
    laneId: data.laneId ?? null,
    origin: data.origin ?? null,
    destination: data.destination ?? null,
    // Normalize legacy fields to new structure
    originOptions: data.originOptions ?? data.origin?.options ?? [],
    destOptions: data.destOptions ?? data.destination?.options ?? [],
    error: data.error ?? null
  };
});

/**
 * Enhanced utility function to validate a lane with better error handling
 * and field normalization for both snake_case and camelCase
 * @param {Object} lane - Lane object to validate
 * @returns {Object} - { success, data, error }
 */
export function validateLane(lane) {
  try {
    // Handle both snake_case and camelCase field names
    const normalizedLane = {
      ...lane,
      // Handle destination field naming inconsistencies
      dest_city: lane.dest_city || lane.destCity || lane.destination_city || lane.destinationCity || null,
      dest_state: lane.dest_state || lane.destState || lane.destination_state || lane.destinationState || null,
      // Handle origin field naming inconsistencies
      origin_city: lane.origin_city || lane.originCity || null,
      origin_state: lane.origin_state || lane.originState || null,
      origin_zip: lane.origin_zip || lane.originZip || null,
      // Ensure timestamps exist to prevent validation errors
      created_at: lane.created_at || lane.createdAt || new Date().toISOString(),
      updated_at: lane.updated_at || lane.updatedAt || new Date().toISOString(),
      // Ensure equipment code exists
      equipment_code: lane.equipment_code || lane.equipmentCode || null
    };

    // Add protection for missing fields
    if (!normalizedLane.dest_city || normalizedLane.dest_city === 'Unknown') {
      console.warn('[validateLane] Missing destination city, using fallback value');
    }

    if (!normalizedLane.dest_state || normalizedLane.dest_state === 'Unknown') {
      console.warn('[validateLane] Missing destination state, using fallback value');
    }

    const result = LaneSchema.safeParse(normalizedLane);
    
    if (result.success) {
      return { success: true, data: result.data, error: null };
    } else {
      console.error('[validateLane] Validation failed:', result.error.format());
      return { 
        success: false, 
        data: null, 
        error: result.error.format(),
        originalLane: lane,
        normalizedLane
      };
    }
  } catch (error) {
    console.error('[validateLane] Exception during validation:', error);
    return { 
      success: false, 
      data: null, 
      error: {
        message: error.message,
        stack: error.stack,
        originalLane: lane
      }
    };
  }
}

/**
 * Enhanced utility function to validate options payload
 * with better error handling and field normalization
 * @param {Object} payload - Options payload to validate
 * @returns {Object} - { success, data, error }
 */
export function validateOptionsPayload(payload) {
  try {
    // Handle potential null or undefined payload
    if (!payload) {
      console.error('[validateOptionsPayload] Null or undefined payload received');
      return { 
        success: false, 
        data: null, 
        error: { message: 'Payload cannot be null or undefined' }
      };
    }

    // Normalize payload to handle both snake_case and camelCase field names
    const normalizedPayload = {
      ...payload,
      // Ensure all required fields exist regardless of naming convention
      laneId: payload.laneId || payload.lane_id || payload.id || null,
      originCity: payload.originCity || payload.origin_city || null,
      originState: payload.originState || payload.origin_state || null,
      destinationCity: payload.destinationCity || payload.destination_city || payload.dest_city || null,
      destinationState: payload.destinationState || payload.destination_state || payload.dest_state || null,
      equipmentCode: payload.equipmentCode || payload.equipment_code || null
    };

    const result = OptionsPayloadSchema.safeParse(normalizedPayload);
    
    if (result.success) {
      return { success: true, data: result.data, error: null };
    } else {
      console.error('[validateOptionsPayload] Validation failed:', result.error.format());
      return { 
        success: false, 
        data: null, 
        error: result.error.format(),
        originalPayload: payload,
        normalizedPayload
      };
    }
  } catch (error) {
    console.error('[validateOptionsPayload] Exception during validation:', error);
    return { 
      success: false, 
      data: null, 
      error: {
        message: error.message,
        stack: error.stack,
        originalPayload: payload
      }
    };
  }
}