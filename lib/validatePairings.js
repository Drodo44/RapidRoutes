// lib/validatePairings.js
// Validates and normalizes city pairs for the intelligence pairing system

/**
 * Validates that a city pairing has all required fields
 * @param {Object} pairing - The city pair to validate
 * @param {Object} pairing.origin - Origin city data
 * @param {Object} pairing.destination - Destination city data
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validatePairing(pairing) {
  const errors = [];
  
  // Check for required objects
  if (!pairing) {
    return { valid: false, errors: ['Pairing is undefined'] };
  }
  
  if (!pairing.origin) {
    errors.push('Origin is missing');
  }
  
  if (!pairing.destination) {
    errors.push('Destination is missing');
  }
  
  // If either main object is missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  
  // Check origin fields
  if (!pairing.origin.city) errors.push('Origin city is missing');
  if (!pairing.origin.state) errors.push('Origin state is missing');
  if (!pairing.origin.zip) errors.push('Origin zip is missing');
  if (!pairing.origin.kma_code) errors.push('Origin KMA is missing');
  
  // Check destination fields
  if (!pairing.destination.city) errors.push('Destination city is missing');
  if (!pairing.destination.state) errors.push('Destination state is missing');
  if (!pairing.destination.zip) errors.push('Destination zip is missing');
  if (!pairing.destination.kma_code) errors.push('Destination KMA is missing');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalizes pairing data to ensure it has the required format with
 * city, state, zip, kma, and distance fields
 * @param {Object} pairing - The city pair to normalize
 * @returns {Object} Normalized pairing with standardized fields
 */
export function normalizePairing(pairing) {
  if (!pairing) {
    console.error('Cannot normalize undefined pairing');
    return null;
  }
  
  // Create a deep copy to avoid modifying the original
  const normalizedPairing = {
    origin: {},
    destination: {}
  };
  
  // Normalize origin
  if (pairing.origin) {
    normalizedPairing.origin = {
      city: pairing.origin.city || '',
      state: pairing.origin.state || pairing.origin.state_or_province || '',
      zip: pairing.origin.zip || pairing.origin.postal_code || '',
      kma: pairing.origin.kma_code || '',
      distance: pairing.origin.distance || 0
    };
  }
  
  // Normalize destination
  if (pairing.destination) {
    normalizedPairing.destination = {
      city: pairing.destination.city || '',
      state: pairing.destination.state || pairing.destination.state_or_province || '',
      zip: pairing.destination.zip || pairing.destination.postal_code || '',
      kma: pairing.destination.kma_code || '',
      distance: pairing.destination.distance || 0
    };
  }
  
  return normalizedPairing;
}