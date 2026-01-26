// lib/referenceIdUtils.js
// Unified reference ID generation logic shared across CSV export, recap search, and display

/**
 * Generate a new reference ID for a lane
 * Uses consistent format: RR[YY][MM][DD][RRR] where RRR is random
 * @returns {string} - Reference ID in format RRYYMMDDRR
 */
export function generateNewReferenceId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RR${year}${month}${day}${random}`;
}

/**
 * Generate a consistent reference ID from a lane UUID
 * Uses the same logic as CSV generation for 100% consistency
 * @param {string} laneId - The lane UUID
 * @returns {string} - Reference ID in format RR12345
 */
export function generateReferenceId(laneId) {
  if (!laneId) return 'RR00000';
  
  const laneIdStr = String(laneId);
  
  // Extract numeric characters from first part of UUID
  const numericPart = laneIdStr.split('-')[0].replace(/[a-f]/g, '').substring(0,5) || '10000';
  const referenceNum = String(Math.abs(parseInt(numericPart, 10) || 10000) % 100000).padStart(5, '0');
  
  return `RR${referenceNum}`;
}

/**
 * Get the display reference ID for a lane (prefer stored, fallback to generated)
 * @param {Object} lane - Lane object with id and optional reference_id
 * @returns {string} - Clean reference ID for display
 */
export function getDisplayReferenceId(lane) {
  if (lane.reference_id && /^RR\d{5}$/.test(cleanReferenceId(lane.reference_id))) {
    return cleanReferenceId(lane.reference_id);
  }
  
  return generateReferenceId(lane.id);
}

/**
 * Clean reference ID by removing Excel formatting
 * @param {string} refId - Reference ID that may have Excel quotes
 * @returns {string} - Clean reference ID
 */
export function cleanReferenceId(refId) {
  if (!refId) return '';
  // Remove Excel text formatting like ="RR12345"
  return String(refId).replace(/^="?|"?$/g, '');
}

/**
 * Check if a search query matches a lane's reference ID
 * @param {string} searchQuery - User's search input
 * @param {Object} lane - Lane object with id and optional reference_id
 * @returns {boolean} - True if reference ID matches search
 */
export function matchesReferenceId(searchQuery, lane) {
  if (!searchQuery || !lane) return false;
  
  const query = searchQuery.toLowerCase().trim();
  const displayRefId = getDisplayReferenceId(lane).toLowerCase();
  
  // Support multiple search patterns:
  // - Full reference ID: "RR52169" or "rr52169"
  // - Numeric part only: "52169"
  // - Partial matches: "521", "69", etc.
  
  // Full match
  if (displayRefId === query) return true;
  
  // Contains match
  if (displayRefId.includes(query)) return true;
  
  // Numeric-only match (remove RR prefix)
  const numericPart = displayRefId.slice(2);
  const queryNumeric = query.replace(/^rr/i, '');
  
  if (numericPart === queryNumeric) return true;
  if (numericPart.includes(queryNumeric)) return true;
  if (queryNumeric.includes(numericPart)) return true;
  
  return false;
}
