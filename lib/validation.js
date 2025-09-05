// lib/validation.js
import { EQUIPMENT_WEIGHT_LIMITS } from './constants';

/**
 * Validate lane data before saving
 */
export function validateLane(lane) {
  const errors = [];

  // Required fields
  const requiredFields = {
    origin_city: 'Origin city is required',
    origin_state: 'Origin state is required',
    dest_city: 'Destination city is required',
    dest_state: 'Destination state is required',
    equipment_code: 'Equipment type is required',
    pickup_earliest: 'Pickup date is required'
  };

  Object.entries(requiredFields).forEach(([field, message]) => {
    if (!lane[field]) errors.push(message);
  });

  // Equipment weight validation
  if (lane.equipment_code) {
    const limit = EQUIPMENT_WEIGHT_LIMITS[lane.equipment_code];
    if (!limit) {
      errors.push(`Invalid equipment code: ${lane.equipment_code}`);
    } else {
      if (lane.randomize_weight) {
        if (lane.weight_max > limit) {
          errors.push(`Maximum weight ${lane.weight_max} exceeds ${lane.equipment_code} limit of ${limit}`);
        }
      } else if (lane.weight_lbs > limit) {
        errors.push(`Weight ${lane.weight_lbs} exceeds ${lane.equipment_code} limit of ${limit}`);
      }
    }
  }

  // Date validation
  if (lane.pickup_earliest && lane.pickup_latest) {
    const earliest = new Date(lane.pickup_earliest);
    const latest = new Date(lane.pickup_latest);
    if (latest < earliest) {
      errors.push('Latest pickup date cannot be before earliest pickup date');
    }
  }

  // Length validation
  if (lane.length_ft) {
    const length = Number(lane.length_ft);
    if (isNaN(length) || length <= 0 || length > 53) {
      errors.push('Length must be between 1 and 53 feet');
    }
  }

  // State format validation
  if (lane.origin_state && !/^[A-Z]{2}$/.test(lane.origin_state)) {
    errors.push('Origin state must be a 2-letter code');
  }
  if (lane.dest_state && !/^[A-Z]{2}$/.test(lane.dest_state)) {
    errors.push('Destination state must be a 2-letter code');
  }

  return errors;
}
