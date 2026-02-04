// lib/enterpriseValidation.js
// Enterprise-grade validation system for CSV generation pipeline
// Enforces hard guarantees and prevents silent failures

import { DAT_HEADERS } from './datHeaders.js';
import { monitor } from './monitor.js';

import { DAT_EQUIPMENT } from '../data/datEquipment.js';

// Build valid equipment codes and weight limits from DAT_EQUIPMENT
const DAT_VALID_CODES = DAT_EQUIPMENT.map(eq => eq.code);

// DAT-compliant weight limits per equipment type
const EQUIPMENT_LIMITS = {
  // Dry Van - 46,000 lbs
  'V': 46000,
  'VNT': 46000,
  'BOX': 46000,
  'SPRV': 46000,
  'DRY': 46000,
  'STAK': 46000,
  'MFG': 46000,
  'MAIL': 46000,
  'BEV': 46000,
  
  // Reefer - 42,000 lbs
  'R': 42000,
  'RFS': 42000,
  'RVENT': 42000,
  'REEF': 42000,
  'PHA': 42000,
  'FOOD': 42000,
  'ICE': 42000,
  'GENS': 42000,
  
  // Open Deck equipment - 48,000 lbs
  'F': 48000,
  'FD': 48000,
  'FT': 48000,
  'SD': 48000,
  'DD': 48000,
  'RGN': 48000,
  'LB': 48000,
  'LBY': 48000,
  'AC': 48000,
  'MX': 48000,
  'STRETCHF': 48000,
  'STRETCHSD': 48000,
  'CONEST': 48000,
  'CURT': 48000,
  'PIPE': 48000,
  'FB': 48000,
  'SDD': 48000,
  'DDROP': 48000,
  'STEP': 48000,
  'CONES': 48000,
  'GLS': 48000,
  'COIL': 48000,
  'BRICK': 48000,
  'STEEL': 48000,
  'LUM': 48000,
  
  // Default for any equipment not explicitly listed
  'DEFAULT': 48000
};

// Get weight limit for equipment code with fallback
function getEquipmentWeightLimit(code) {
  return EQUIPMENT_LIMITS[code] || EQUIPMENT_LIMITS['DEFAULT'];
}

export function isValidEquipmentCode(code) {
  // Accept all codes present in DAT_EQUIPMENT
  return DAT_EQUIPMENT.some(eq => eq.code === code);
}

export function validateLane(lane) {
  const errors = [];
  const traceId = `lane_${lane?.id || Date.now()}`;
  // Equipment code validation
  if (!isValidEquipmentCode(lane.equipment_code)) {
    errors.push(`Invalid equipment code: ${lane.equipment_code}`);
  }
  // Equipment weight limits validation using DAT-compliant limits
  const limit = getEquipmentWeightLimit(lane.equipment_code);
  if (!lane.randomize_weight && lane.weight_lbs > limit) {
    errors.push(`weight_lbs ${lane.weight_lbs} exceeds ${lane.equipment_code} limit of ${limit}`);
  }
  if (lane.randomize_weight && lane.weight_max > limit) {
    errors.push(`weight_max ${lane.weight_max} exceeds ${lane.equipment_code} limit of ${limit}`);
  }
  // ...existing code...
  if (errors.length > 0) {
    const error = new ValidationError(
      `Lane validation failed: ${errors.join('; ')}`,
      { 
        traceId,
        lane_id: lane?.id,
        errors,
        lane_fields: Object.keys(lane || {})
      }
    );
    monitor.log('error', 'Lane validation failed:', error.details);
    throw error;
  }
  monitor.log('debug', `✅ Lane ${lane.id} passed validation`, { traceId });
  return true;
}

/**
 * Lane schema definition with hard requirements
 */
export const LANE_SCHEMA = {
  required: {
    id: { type: 'string', minLength: 1 },
    origin_city: { type: 'string', minLength: 1 },
    origin_state: { type: 'string', length: 2 },
    dest_city: { type: 'string', minLength: 1 },
    dest_state: { type: 'string', length: 2 },
    equipment_code: { type: 'string', minLength: 1, maxLength: 3 },
    // pickup_earliest: accept either legacy MM/DD/YYYY OR ISO 8601 date/date-time strings
    // We remove rigid pattern here and perform custom validation later to allow transition
    pickup_earliest: { type: 'string', minLength: 8 },
    length_ft: { type: 'number', min: 1, max: 199 }
  },
  conditional: {
    // If randomize_weight is false, weight_lbs is required
    weight_lbs: { 
      condition: (lane) => !lane.randomize_weight,
      type: 'number', 
      min: 1, 
      max: 100000 
    },
    // If randomize_weight is true, both min/max are required
    weight_min: { 
      condition: (lane) => lane.randomize_weight === true,
      type: 'number', 
      min: 1, 
      max: 100000 
    },
    weight_max: { 
      condition: (lane) => lane.randomize_weight === true,
      type: 'number', 
      min: 1, 
      max: 100000 
    }
  },
  optional: {
    origin_zip: { type: 'string', maxLength: 10 },
    dest_zip: { type: 'string', maxLength: 10 },
    // pickup_latest (optional) same flexible logic as earliest (handled in custom validation)
    pickup_latest: { type: 'string', minLength: 8 },
    full_partial: { type: 'string', enum: ['full', 'partial'] },
    comment: { type: 'string', maxLength: 140 },
    commodity: { type: 'string', maxLength: 70 },
    reference_id: { type: 'string', maxLength: 8 }
  }
};

/**
 * City pair schema definition
 */
export const CITY_PAIR_SCHEMA = {
  pickup: {
    city: { type: 'string', minLength: 1 },
    state: { type: 'string', length: 2 },
    kma_code: { type: 'string', minLength: 1 }
  },
  delivery: {
    city: { type: 'string', minLength: 1 },
    state: { type: 'string', length: 2 },
    kma_code: { type: 'string', minLength: 1 }
  }
};

/**
 * CSV row schema definition - every field must be present
 */
export const CSV_ROW_SCHEMA = {
  'Pickup Earliest*': { type: 'string', required: true, minLength: 1 },
  'Pickup Latest': { type: 'string', required: false },
  'Length (ft)*': { type: 'string', required: true, pattern: /^\d+$/ },
  'Weight (lbs)*': { type: 'string', required: true, pattern: /^\d+$/ },
  'Full/Partial*': { type: 'string', required: true, enum: ['full', 'partial'] },
  'Equipment*': { type: 'string', required: true, minLength: 1 },
  'Use Private Network*': { type: 'string', required: true, enum: ['yes', 'no', 'YES', 'NO'] },
  'Private Network Rate': { type: 'string', required: false },
  'Allow Private Network Booking': { type: 'string', required: false },
  'Allow Private Network Bidding': { type: 'string', required: false },
  'Use DAT Loadboard*': { type: 'string', required: true, enum: ['yes', 'no', 'YES', 'NO'] },
  'DAT Loadboard Rate': { type: 'string', required: false },
  'Allow DAT Loadboard Booking': { type: 'string', required: false },
  'Use Extended Network': { type: 'string', required: false },
  'Contact Method*': { type: 'string', required: true, enum: ['email', 'primary phone'] },
  'Origin City*': { type: 'string', required: true, minLength: 1 },
  'Origin State*': { type: 'string', required: true, length: 2 },
  'Origin Postal Code': { type: 'string', required: false },
  'Destination City*': { type: 'string', required: true, minLength: 1 },
  'Destination State*': { type: 'string', required: true, length: 2 },
  'Destination Postal Code': { type: 'string', required: false },
  'Comment': { type: 'string', required: false, maxLength: 140 },
  'Commodity': { type: 'string', required: false, maxLength: 70 },
  'Reference ID': { type: 'string', required: false, maxLength: 8 }
};

/**
 * Validation error with detailed context
 */
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.isValidationError = true;
  }
}

/**
 * Validate a value against a field definition
 */
function validateField(value, fieldDef, fieldName, context = {}) {
  const errors = [];

  // Required field check
  if (fieldDef.required && (value === null || value === undefined || value === '')) {
    errors.push(`${fieldName} is required but missing`);
    return errors;
  }

  // Skip further validation if field is empty and not required
  if (!fieldDef.required && (value === null || value === undefined || value === '')) {
    return errors;
  }

  // Type validation
  if (fieldDef.type) {
    const actualType = typeof value;
    if (fieldDef.type === 'number' && actualType !== 'number') {
      // Try to convert string numbers
      const numValue = Number(value);
      if (Number.isNaN(numValue)) {
        errors.push(`${fieldName} must be a number, got ${actualType}`);
        return errors;
      }
      value = numValue; // Use converted value for further validation
    } else if (fieldDef.type === 'string' && actualType !== 'string') {
      errors.push(`${fieldName} must be a string, got ${actualType}`);
      return errors;
    }
  }

  // Length validation for strings
  if (typeof value === 'string') {
    if (fieldDef.minLength && value.length < fieldDef.minLength) {
      errors.push(`${fieldName} must be at least ${fieldDef.minLength} characters`);
    }
    if (fieldDef.maxLength && value.length > fieldDef.maxLength) {
      errors.push(`${fieldName} must be at most ${fieldDef.maxLength} characters`);
    }
    if (fieldDef.length && value.length !== fieldDef.length) {
      errors.push(`${fieldName} must be exactly ${fieldDef.length} characters`);
    }
  }

  // Range validation for numbers
  if (typeof value === 'number') {
    if (fieldDef.min !== undefined && value < fieldDef.min) {
      errors.push(`${fieldName} must be at least ${fieldDef.min}`);
    }
    if (fieldDef.max !== undefined && value > fieldDef.max) {
      errors.push(`${fieldName} must be at most ${fieldDef.max}`);
    }
  }

  // Pattern validation
  if (fieldDef.pattern && typeof value === 'string' && !fieldDef.pattern.test(value)) {
    errors.push(`${fieldName} format is invalid`);
  }

  // Enum validation
  if (fieldDef.enum && !fieldDef.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${fieldDef.enum.join(', ')}`);
  }

  return errors;
}

// Flexible date validation accepting:
// 1) Legacy MM/DD/YYYY (one or two digit month/day)
// 2) ISO date YYYY-MM-DD
// 3) Full ISO date-time YYYY-MM-DDTHH:MM:SS.sssZ (any valid toISOString output)
// Returns null if valid, or error message string if invalid
function validateFlexibleDate(value, fieldName) {
  if (value === null || value === undefined || value === '') return `${fieldName} is required but missing`;
  if (typeof value !== 'string') return `${fieldName} must be a string`;

  const legacyPattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/; // MM/DD/YYYY
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
  const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/; // Strict toISOString format

  if (legacyPattern.test(value) || isoDatePattern.test(value) || isoDateTimePattern.test(value)) {
    const normalized = value.length === 10 && value.includes('/') ? convertLegacyToISO(value) : value;
    // Explicit hour extraction to block 24:xx:xx which Date.parse normalizes
    const hourMatch = normalized.match(/T(\d{2}):/);
    if (hourMatch) {
      const hour = Number(hourMatch[1]);
      if (hour < 0 || hour > 23) {
        return `${fieldName} format is invalid`;
      }
    }
    const time = Date.parse(normalized);
    if (isNaN(time)) {
      return `${fieldName} format is invalid`;
    }
    return null; // valid
  }

  // Attempt tolerant parsing for slight variations (e.g., missing milliseconds)
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) {
    // Additional hour 24 guard for loosely parsed values
    const hourMatch = value.match(/T(\d{2}):/);
    if (hourMatch) {
      const hour = Number(hourMatch[1]);
      if (hour > 23) return `${fieldName} format is invalid`;
    }
    return null;
  }

  return `${fieldName} format is invalid`;
}

function convertLegacyToISO(mdy) {
  // mdy expected MM/DD/YYYY
  const [m, d, y] = mdy.split('/').map(s => s.padStart(2, '0'));
  return `${y}-${m}-${d}T00:00:00.000Z`;
}



/**
 * Validate city pair object against CITY_PAIR_SCHEMA
 * THROWS ValidationError on any violation - NO SILENT FAILURES
 */
export function validateCityPair(pair) {
  const errors = [];
  const traceId = `pair_${Date.now()}`;

  if (!pair || typeof pair !== 'object') {
    throw new ValidationError('City pair must be a valid object', { traceId });
  }

  // Validate pickup city
  if (!pair.pickup || typeof pair.pickup !== 'object') {
    errors.push('pickup must be a valid object');
  } else {
    for (const [fieldName, fieldDef] of Object.entries(CITY_PAIR_SCHEMA.pickup)) {
      const fieldErrors = validateField(pair.pickup[fieldName], { ...fieldDef, required: true }, `pickup.${fieldName}`, { traceId });
      errors.push(...fieldErrors);
    }
  }

  // Validate delivery city
  if (!pair.delivery || typeof pair.delivery !== 'object') {
    errors.push('delivery must be a valid object');
  } else {
    for (const [fieldName, fieldDef] of Object.entries(CITY_PAIR_SCHEMA.delivery)) {
      const fieldErrors = validateField(pair.delivery[fieldName], { ...fieldDef, required: true }, `delivery.${fieldName}`, { traceId });
      errors.push(...fieldErrors);
    }
  }

  // Uniqueness validation - pickup and delivery cannot be the same
  if (pair.pickup && pair.delivery) {
    const pickupKey = `${pair.pickup.city}-${pair.pickup.state}`;
    const deliveryKey = `${pair.delivery.city}-${pair.delivery.state}`;
    if (pickupKey === deliveryKey) {
      errors.push('pickup and delivery cities cannot be identical');
    }
  }

  if (errors.length > 0) {
    const error = new ValidationError(
      `City pair validation failed: ${errors.join('; ')}`,
      { traceId, errors, pair }
    );
    monitor.log('error', 'City pair validation failed:', error.details);
    throw error;
  }

  return true;
}

/**
 * Validate CSV row object against CSV_ROW_SCHEMA
 * THROWS ValidationError on any violation - NO SILENT FAILURES
 */
export function validateCsvRow(row, rowIndex = -1) {
  const errors = [];
  const traceId = `row_${rowIndex}_${Date.now()}`;

  if (!row || typeof row !== 'object') {
    throw new ValidationError('CSV row must be a valid object', { traceId, rowIndex });
  }

  // Validate all DAT_HEADERS are present in row
  for (const header of DAT_HEADERS) {
    if (!(header in row)) {
      errors.push(`Missing header: ${header}`);
    }
  }

  // Validate each field according to schema
  for (const [header, fieldDef] of Object.entries(CSV_ROW_SCHEMA)) {
    const fieldErrors = validateField(row[header], fieldDef, header, { traceId, rowIndex });
    errors.push(...fieldErrors);
  }

  // Cross-field validation for CSV rows
  if (row['Pickup Latest'] && row['Pickup Earliest*']) {
    // Validate date formats and ordering if both are present
    // Add date validation logic here if needed
  }

  if (errors.length > 0) {
    const error = new ValidationError(
      `CSV row validation failed: ${errors.join('; ')}`,
      { 
        traceId,
        rowIndex,
        errors,
        row_headers: Object.keys(row || {}),
        missing_headers: DAT_HEADERS.filter(h => !(h in row))
      }
    );
    monitor.log('error', 'CSV row validation failed:', error.details);
    throw error;
  }

  return true;
}

/**
 * Validate complete dataset before CSV generation
 * Prevents silent failures by catching issues early
 */
export function validateDataset(lanes, expectedMinPairsPerLane = 6) {
  const traceId = `dataset_${Date.now()}`;
  const validation = {
    traceId,
    lanes: {
      total: lanes?.length || 0,
      valid: 0,
      invalid: 0
    },
    errors: []
  };

  if (!Array.isArray(lanes)) {
    throw new ValidationError('Lanes must be an array', { traceId });
  }

  if (lanes.length === 0) {
    throw new ValidationError('Dataset cannot be empty', { traceId });
  }

  // Validate each lane
  for (let i = 0; i < lanes.length; i++) {
    try {
      validateLane(lanes[i]);
      validation.lanes.valid++;
    } catch (error) {
      validation.lanes.invalid++;
      validation.errors.push({
        lane_index: i,
        lane_id: lanes[i]?.id,
        error: error.message
      });
    }
  }

  if (validation.lanes.invalid > 0) {
    const error = new ValidationError(
      `Dataset validation failed: ${validation.lanes.invalid} of ${validation.lanes.total} lanes are invalid`,
      validation
    );
    monitor.log('error', 'Dataset validation failed:', error.details);
    throw error;
  }

  monitor.log('info', `✅ Dataset validation passed: ${validation.lanes.valid} lanes validated`, { traceId });
  return validation;
}