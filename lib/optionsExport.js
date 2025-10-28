// lib/optionsExport.js
// Handles CSV and Recap generation from selected city options

import { DAT_HEADERS } from './datHeaders.js';
import { toCsv } from './datCsvBuilder.js';
import { formatDatDate } from './datCsvBuilder.js';

/**
 * Parse city ID string back into components
 * Format: "id-city-state"
 */
function parseCityId(cityIdString) {
  const parts = cityIdString.split('-');
  return {
    id: parts[0],
    city: parts.slice(1, -1).join('-'), // Handle cities with hyphens in name
    state: parts[parts.length - 1]
  };
}

/**
 * Generate DAT CSV from selected pickup/delivery cities
 * Creates duplicate rows for "Email" and "Primary Phone" contact methods
 * 
 * @param {Object} lane - The base lane object
 * @param {Array} originCityIds - Selected origin city ID strings
 * @param {Array} destCityIds - Selected destination city ID strings
 * @param {Array} originOptions - Full origin options with city data
 * @param {Array} destOptions - Full destination options with city data
 * @returns {Object} { csvText, totalRows, combinations }
 */
export function generateDatCsvFromSelections(lane, originCityIds, destCityIds, originOptions, destOptions) {
  // Create lookup maps for full city data
  const originMap = new Map();
  originOptions.forEach(city => {
    const id = `${city.id}-${city.city}-${city.state}`;
    originMap.set(id, city);
  });
  
  const destMap = new Map();
  destOptions.forEach(city => {
    const id = `${city.id}-${city.city}-${city.state}`;
    destMap.set(id, city);
  });
  
  const rows = [];
  const contactMethods = ['Email', 'Primary Phone']; // DAT requires duplicates
  
  // Generate all combinations
  originCityIds.forEach(originId => {
    const originCity = originMap.get(originId);
    if (!originCity) return;
    
    destCityIds.forEach(destId => {
      const destCity = destMap.get(destId);
      if (!destCity) return;
      
      // Create 2 rows per combination (email + phone)
      contactMethods.forEach(contactMethod => {
        const row = buildDatRow(lane, originCity, destCity, contactMethod);
        rows.push(row);
      });
    });
  });
  
  const csvText = toCsv(DAT_HEADERS, rows);
  
  return {
    csvText,
    totalRows: rows.length,
    combinations: originCityIds.length * destCityIds.length,
    rowsPerCombination: 2
  };
}

/**
 * Build a single DAT CSV row following exact header order
 */
function buildDatRow(lane, originCity, destCity, contactMethod) {
  // Format dates as MM/DD/YYYY
  const pickupEarliest = formatDateForDat(lane.pickup_earliest);
  const pickupLatest = formatDateForDat(lane.pickup_latest || lane.pickup_earliest);
  
  // Handle weight
  let weight = lane.weight_lbs;
  if (lane.randomize_weight && lane.weight_min && lane.weight_max) {
    weight = Math.floor(Math.random() * (lane.weight_max - lane.weight_min + 1)) + lane.weight_min;
  }
  
  // Map equipment to DAT code
  const equipmentCode = mapEquipmentToDat(lane.equipment_code);
  
  // Build row in exact DAT_HEADERS order
  return [
    pickupEarliest,                    // Pickup Earliest*
    pickupLatest,                      // Pickup Latest
    lane.length_ft || '',              // Length (ft)*
    weight || '',                      // Weight (lbs)*
    lane.full_partial || 'FULL',       // Full/Partial*
    equipmentCode,                     // Equipment*
    'N',                               // Use Private Network*
    '',                                // Private Network Rate
    'N',                               // Allow Private Network Booking
    'N',                               // Allow Private Network Bidding
    'Y',                               // Use DAT Loadboard*
    '',                                // DAT Loadboard Rate
    'N',                               // Allow DAT Loadboard Booking
    'N',                               // Use Extended Network
    contactMethod,                     // Contact Method*
    originCity.city,                   // Origin City*
    originCity.state,                  // Origin State*
    originCity.zip || '',              // Origin Postal Code
    destCity.city,                     // Destination City*
    destCity.state,                    // Destination State*
    destCity.zip || '',                // Destination Postal Code
    lane.comment || '',                // Comment
    lane.commodity || '',              // Commodity
    ''                                 // Reference ID (leave empty for auto-generation)
  ];
}

/**
 * Format date for DAT CSV (MM/DD/YYYY)
 */
function formatDateForDat(dateValue) {
  if (!dateValue) return '';
  
  // If already in MM/DD/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateValue)) {
    return dateValue;
  }
  
  // Parse and format
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `${month}/${day}/${year}`;
}

/**
 * Map internal equipment codes to DAT codes
 */
function mapEquipmentToDat(equipmentCode) {
  // If already a DAT code (2-letter), return as-is
  if (!equipmentCode) return 'V'; // Default to Van
  
  // Extract DAT code if format is "XX - Description"
  const datCode = equipmentCode.split(' - ')[0].trim();
  return datCode || 'V';
}

/**
 * Generate HTML Recap from selected cities
 * Creates a dark-themed, print-ready HTML document
 * 
 * @param {Object} lane - The base lane object
 * @param {Array} originCityIds - Selected origin city IDs
 * @param {Array} destCityIds - Selected destination city IDs
 * @param {Array} originOptions - Full origin options
 * @param {Array} destOptions - Full destination options
 * @returns {string} HTML content
 */
export function generateRecapFromSelections(lane, originCityIds, destCityIds, originOptions, destOptions) {
  // Create lookup maps
  const originMap = new Map();
  originOptions.forEach(city => {
    const id = `${city.id}-${city.city}-${city.state}`;
    originMap.set(id, city);
  });
  
  const destMap = new Map();
  destOptions.forEach(city => {
    const id = `${city.id}-${city.city}-${city.state}`;
    destMap.set(id, city);
  });
  
  // Get selected city objects
  const selectedOrigins = originCityIds.map(id => originMap.get(id)).filter(Boolean);
  const selectedDests = destCityIds.map(id => destMap.get(id)).filter(Boolean);
  
  const totalCombinations = selectedOrigins.length * selectedDests.length;
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  // Build HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lane Posting Recap - ${lane.origin_city} to ${lane.destination_city || lane.dest_city}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111827;
      color: #e5e7eb;
      padding: 2rem;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      padding: 2rem;
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 1rem;
      margin-bottom: 2rem;
    }
    h1 {
      color: #3b82f6;
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
    }
    .meta {
      color: #9ca3af;
      font-size: 0.875rem;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 6px;
    }
    .summary-item {
      display: flex;
      flex-direction: column;
    }
    .summary-label {
      color: #9ca3af;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }
    .summary-value {
      color: #e5e7eb;
      font-size: 1.125rem;
      font-weight: 600;
    }
    .section {
      margin-bottom: 2rem;
    }
    h2 {
      color: #60a5fa;
      font-size: 1.25rem;
      margin-bottom: 1rem;
      border-bottom: 1px solid #374151;
      padding-bottom: 0.5rem;
    }
    .city-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 0.75rem;
    }
    .city-card {
      background: #111827;
      border: 1px solid #374151;
      border-radius: 4px;
      padding: 0.75rem;
    }
    .city-name {
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 0.25rem;
    }
    .city-details {
      font-size: 0.875rem;
      color: #9ca3af;
    }
    .kma-badge {
      display: inline-block;
      background: #374151;
      color: #d1d5db;
      padding: 0.125rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: 0.25rem;
    }
    .combinations {
      background: #064e3b;
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 1rem;
      text-align: center;
      margin-top: 2rem;
    }
    .combinations-number {
      font-size: 2rem;
      font-weight: 700;
      color: #10b981;
    }
    .combinations-label {
      color: #6ee7b7;
      margin-top: 0.25rem;
    }
    @media print {
      body {
        background: white;
        color: black;
      }
      .container {
        background: white;
        border: 1px solid #ddd;
      }
      .city-card, .summary {
        background: #f9fafb;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Lane Posting Recap</h1>
      <div class="meta">Generated: ${timestamp} | Lane ID: ${lane.id.slice(0, 8)}...</div>
    </div>
    
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Equipment</div>
        <div class="summary-value">${lane.equipment_code || 'N/A'}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Weight</div>
        <div class="summary-value">${lane.weight_lbs ? lane.weight_lbs.toLocaleString() + ' lbs' : 'N/A'}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Length</div>
        <div class="summary-value">${lane.length_ft || 'N/A'} ft</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Pickup Dates</div>
        <div class="summary-value">${formatDateForDat(lane.pickup_earliest)}</div>
      </div>
    </div>
    
    <div class="section">
      <h2>Pickup Cities (${selectedOrigins.length})</h2>
      <div class="city-grid">
        ${selectedOrigins.map(city => `
          <div class="city-card">
            <div class="city-name">${city.city}, ${city.state}</div>
            <div class="city-details">
              ${city.zip ? `ZIP: ${city.zip}<br>` : ''}
              ${Math.round(city.distance)} miles from origin
            </div>
            ${city.kma_code ? `<span class="kma-badge">${city.kma_code}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="section">
      <h2>Delivery Cities (${selectedDests.length})</h2>
      <div class="city-grid">
        ${selectedDests.map(city => `
          <div class="city-card">
            <div class="city-name">${city.city}, ${city.state}</div>
            <div class="city-details">
              ${city.zip ? `ZIP: ${city.zip}<br>` : ''}
              ${Math.round(city.distance)} miles from destination
            </div>
            ${city.kma_code ? `<span class="kma-badge">${city.kma_code}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
    
    <div class="combinations">
      <div class="combinations-number">${totalCombinations}</div>
      <div class="combinations-label">Total Lane Combinations to Post</div>
    </div>
  </div>
</body>
</html>`;
  
  return html;
}
