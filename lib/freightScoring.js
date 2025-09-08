// lib/freightIntelligence.js
// Logic for calculating freight scores and market intelligence

/**
 * Calculate freight intelligence score for a city
 */
export function calculateFreightIntelligence(cityRow, equipment, baseCity) {
  const eq = String(equipment || '').toUpperCase();
  if (!cityRow) return 0;
  const name = cityRow.city?.toLowerCase() || '';
  const state = cityRow.state_or_province?.toLowerCase() || '';
  const baseName = baseCity?.city?.toLowerCase() || '';
  const baseState = baseCity?.state_or_province?.toLowerCase() || '';
  
  // Regional freight hub intelligence
  let regionalHubScore = 0;
  if ((baseState === 'ga' && baseName.includes('augusta')) || (baseState === 'sc' && baseName.includes('aiken'))) {
    if (name === 'thomson' && state === 'ga') regionalHubScore = 0.20;
    if (name === 'aiken' && state === 'sc') regionalHubScore = 0.25;
    if (name === 'barnwell' && state === 'sc') regionalHubScore = 0.18;
  }
  
  // Cross-border bonus
  let crossBorderBonus = 0;
  if (baseState !== state) {
    crossBorderBonus = 0.10; // Different state = different market
  }
  
  // Equipment-specific scores
  let equipmentScore = 0;
  if (eq === 'FD' || eq === 'F') {
    if (/(steel|mill|manufacturing|port|construction)/.test(name)) {
      equipmentScore = 0.15;
    }
    if (state === 'pa' || state === 'oh' || state === 'in') {
      equipmentScore += 0.08; // Steel belt
    }
  } else if (eq === 'R' || eq === 'IR') {
    if (/(produce|cold|food|port)/.test(name)) {
      equipmentScore = 0.15;
    }
    if (state === 'ca' || state === 'fl' || state === 'tx') {
      equipmentScore += 0.08; // Produce states  
    }
  } else if (eq === 'V') {
    if (/(distribution|logistics|warehouse)/.test(name)) {
      equipmentScore = 0.12;
    }
    if (name === 'atlanta' || name === 'dallas' || name === 'chicago' || name === 'memphis') {
      equipmentScore += 0.10; // Major hubs
    }
  }
  
  // Distance intelligence
  const distance = cityRow.distance || 0;
  let distanceScore = 0;
  if (distance >= 20 && distance <= 50) {
    distanceScore = 0.15; // Sweet spot
  } else if (distance > 50 && distance <= 75) {
    distanceScore = 0.12; // Still good
  }
  
  return regionalHubScore + crossBorderBonus + equipmentScore + distanceScore;
}
