// components/post-options/ZodValidation.js
import { z } from 'zod';

/**
 * Zod schema for validating lane data
 */
export const LaneSchema = z.object({
  id: z.string().uuid({ message: 'Invalid lane ID format' }),
  origin_city: z.string().min(1, { message: 'Origin city is required' }),
  origin_state: z.string().min(2, { message: 'Origin state is required (2-letter code)' }).max(2),
  origin_zip: z.string().nullable().optional(),
  destination_city: z.string().min(1, { message: 'Destination city is required' }).or(
    z.literal('').transform(() => null).optional() // Handle empty string
  ),
  dest_city: z.string().min(1, { message: 'Destination city is required' }).or(
    z.literal('').transform(() => null).optional() // Handle empty string
  ),
  destination_state: z.string().min(2, { message: 'Destination state is required (2-letter code)' }).max(2).or(
    z.literal('').transform(() => null).optional() // Handle empty string
  ),
  dest_state: z.string().min(2, { message: 'Destination state is required (2-letter code)' }).max(2).or(
    z.literal('').transform(() => null).optional() // Handle empty string
  ),
  dest_zip: z.string().nullable().optional(),
  equipment_code: z.string().min(1, { message: 'Equipment code is required' }),
  weight_lbs: z.number().nullable().optional(),
  length_ft: z.number().nullable().optional(),
  lane_status: z.string().default('current'),
  created_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
}).transform((data) => {
  // Ensure we have destination_city and destination_state consistently
  return {
    ...data,
    destination_city: data.destination_city || data.dest_city,
    destination_state: data.destination_state || data.dest_state
  };
});

/**
 * Zod schema for validating post-options API payload
 */
export const OptionsPayloadSchema = z.object({
  laneId: z.string().uuid({
    message: 'Invalid lane ID format',
  }),
  originCity: z.string().min(1, {
    message: 'Origin city is required',
  }),
  originState: z.string().min(2, {
    message: 'Origin state is required (2-letter code)',
  }),
  destinationCity: z.string().min(1, {
    message: 'Destination city is required',
  }),
  destinationState: z.string().min(2, {
    message: 'Destination state is required (2-letter code)',
  }),
  equipmentCode: z.string().min(1, {
    message: 'Equipment code is required',
  }),
});

/**
 * Zod schema for validating options response
 */
export const OptionsResponseSchema = z.object({
  ok: z.boolean(),
  laneId: z.string().uuid().optional(),
  origin: z.object({
    city: z.string(),
    state: z.string(),
    options: z.array(z.object({
      id: z.string(),
      city: z.string(),
      state: z.string(),
      distance: z.number(),
      kma_code: z.string().optional()
    })).optional()
  }).optional(),
  destination: z.object({
    city: z.string(),
    state: z.string(),
    options: z.array(z.object({
      id: z.string(),
      city: z.string(), 
      state: z.string(),
      distance: z.number(),
      kma_code: z.string().optional()
    })).optional()
  }).optional(),
  originOptions: z.array(z.any()).optional(),
  destOptions: z.array(z.any()).optional(),
  error: z.string().optional()
}).or(
  z.object({
    error: z.string()
  })
);

/**
 * Utility function to validate a lane
 * @param {Object} lane - Lane object to validate
 * @returns {Object} - { success, data, error }
 */
export function validateLane(lane) {
  try {
    const result = LaneSchema.safeParse(lane);
    if (result.success) {
      return { success: true, data: result.data, error: null };
    } else {
      return { 
        success: false, 
        data: null, 
        error: result.error.format()
      };
    }
  } catch (error) {
    return { success: false, data: null, error };
  }
}

/**
 * Utility function to validate options payload
 * @param {Object} payload - Options payload to validate
 * @returns {Object} - { success, data, error }
 */
export function validateOptionsPayload(payload) {
  try {
    const result = OptionsPayloadSchema.safeParse(payload);
    if (result.success) {
      return { success: true, data: result.data, error: null };
    } else {
      return { 
        success: false, 
        data: null, 
        error: result.error.format()
      };
    }
  } catch (error) {
    return { success: false, data: null, error };
  }
}