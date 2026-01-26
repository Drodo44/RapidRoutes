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
 * Generate interactive HTML Recap from selected cities
 * Creates a searchable, dropdown-navigable reference document for handling calls
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
  
  // Generate all combinations with RR# assignments
  const combinations = [];
  let rrCounter = 1;
  
  selectedOrigins.forEach(originCity => {
    selectedDests.forEach(destCity => {
      const rrNumber = `RR${String(rrCounter).padStart(4, '0')}`;
      combinations.push({
        rrNumber,
        origin: originCity,
        destination: destCity,
        displayName: `${originCity.city}, ${originCity.state} → ${destCity.city}, ${destCity.state}`
      });
      rrCounter++;
    });
  });
  
  // Sort combinations alphabetically by display name for dropdown
  const sortedCombinations = [...combinations].sort((a, b) => 
    a.displayName.localeCompare(b.displayName)
  );
  
  const totalCombinations = combinations.length;
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
      padding: 0;
      line-height: 1.6;
    }
    .sticky-header {
      position: sticky;
      top: 0;
      background: #1f2937;
      border-bottom: 2px solid #3b82f6;
      padding: 1rem 2rem;
      z-index: 1000;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      color: #3b82f6;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .meta {
      color: #9ca3af;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    .search-controls {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .search-box, .dropdown-box {
      display: flex;
      flex-direction: column;
    }
    label {
      color: #9ca3af;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }
    input, select {
      padding: 0.75rem;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 6px;
      color: #e5e7eb;
      font-size: 1rem;
      outline: none;
      transition: all 0.2s;
    }
    input:focus, select:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    select {
      cursor: pointer;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #1f2937;
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
    .lane-card {
      background: #1f2937;
      border: 2px solid #374151;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: all 0.3s;
      scroll-margin-top: 200px;
    }
    .lane-card.highlighted {
      border-color: #10b981;
      background: #064e3b;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }
    .lane-card.hidden {
      display: none;
    }
    .lane-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #374151;
    }
    .lane-route {
      flex-grow: 1;
    }
    .lane-cities {
      font-size: 1.25rem;
      font-weight: 600;
      color: #e5e7eb;
      margin-bottom: 0.5rem;
    }
    .lane-cities .arrow {
      color: #3b82f6;
      margin: 0 0.5rem;
    }
    .lane-details {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      font-size: 0.875rem;
      color: #9ca3af;
    }
    .rr-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: #10b981;
      font-family: 'Courier New', monospace;
      padding: 0.5rem 1rem;
      background: #064e3b;
      border: 1px solid #10b981;
      border-radius: 6px;
    }
    .city-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }
    .city-section {
      background: #111827;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #374151;
    }
    .city-section-title {
      color: #60a5fa;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .city-name {
      font-size: 1.125rem;
      color: #e5e7eb;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    .city-meta {
      color: #9ca3af;
      font-size: 0.875rem;
    }
    .kma-badge {
      display: inline-block;
      background: #374151;
      color: #d1d5db;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }
    .no-results {
      text-align: center;
      padding: 3rem;
      color: #9ca3af;
      font-size: 1.125rem;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 8px;
      margin-top: 2rem;
    }
    @media print {
      body { background: white; color: black; }
      .sticky-header { position: static; }
      .search-controls { display: none; }
      .lane-card { border-color: #ddd; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sticky-header">
    <div class="container">
      <h1>🚛 Lane Posting Recap</h1>
      <div class="meta">Generated: ${timestamp} | Lane ID: ${lane.id.slice(0, 8)}... | ${totalCombinations} Total Postings</div>
      
      <div class="search-controls">
        <div class="search-box">
          <label for="rr-search">🔍 Search by RR#</label>
          <input 
            type="text" 
            id="rr-search" 
            placeholder="Type RR0001, RR0002, etc."
            onkeyup="searchByRR(this.value)"
          />
        </div>
        
        <div class="dropdown-box">
          <label for="lane-selector">📍 Jump to Lane Pairing</label>
          <select id="lane-selector" onchange="jumpToLane(this.value)">
            <option value="">Select a city pairing...</option>
            ${sortedCombinations.map(combo => `
              <option value="${combo.rrNumber}">${combo.rrNumber} - ${combo.displayName}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>
  </div>

  <div class="container">
    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Base Lane</div>
        <div class="summary-value">${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city || lane.dest_city}, ${lane.destination_state || lane.dest_state}</div>
      </div>
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
        <div class="summary-label">Pickup Date</div>
        <div class="summary-value">${formatDateForDat(lane.pickup_earliest)}</div>
      </div>
    </div>

    <div id="lanes-container">
      ${combinations.map(combo => `
        <div class="lane-card" id="${combo.rrNumber}" data-rr="${combo.rrNumber}" data-search="${combo.displayName.toLowerCase()}">
          <div class="lane-header">
            <div class="lane-route">
              <div class="lane-cities">
                ${combo.origin.city}, ${combo.origin.state}
                <span class="arrow">→</span>
                ${combo.destination.city}, ${combo.destination.state}
              </div>
              <div class="lane-details">
                <span>📦 ${lane.equipment_code || 'N/A'}</span>
                <span>⚖️ ${lane.weight_lbs ? lane.weight_lbs.toLocaleString() + ' lbs' : 'N/A'}</span>
                <span>📏 ${lane.length_ft || 'N/A'} ft</span>
                <span>📅 ${formatDateForDat(lane.pickup_earliest)}</span>
              </div>
            </div>
            <div class="rr-number">${combo.rrNumber}</div>
          </div>
          
          <div class="city-info">
            <div class="city-section">
              <div class="city-section-title">Pickup Location</div>
              <div class="city-name">${combo.origin.city}, ${combo.origin.state}</div>
              <div class="city-meta">
                ${combo.origin.zip ? `ZIP: ${combo.origin.zip}<br>` : ''}
                ${Math.round(combo.origin.distance)} miles from base origin
              </div>
              ${combo.origin.kma_code ? `<span class="kma-badge">KMA: ${combo.origin.kma_code}</span>` : ''}
            </div>
            
            <div class="city-section">
              <div class="city-section-title">Delivery Location</div>
              <div class="city-name">${combo.destination.city}, ${combo.destination.state}</div>
              <div class="city-meta">
                ${combo.destination.zip ? `ZIP: ${combo.destination.zip}<br>` : ''}
                ${Math.round(combo.destination.distance)} miles from base destination
              </div>
              ${combo.destination.kma_code ? `<span class="kma-badge">KMA: ${combo.destination.kma_code}</span>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="no-results" class="no-results" style="display: none;">
      No lanes found matching your search.
    </div>
  </div>

  <script>
    let highlightedCard = null;

    function clearHighlights() {
      if (highlightedCard) {
        highlightedCard.classList.remove('highlighted');
        highlightedCard = null;
      }
    }

    function jumpToLane(rrNumber) {
      if (!rrNumber) return;
      
      clearHighlights();
      const card = document.getElementById(rrNumber);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlighted');
        highlightedCard = card;
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
          if (highlightedCard === card) {
            card.classList.remove('highlighted');
            highlightedCard = null;
          }
        }, 3000);
      }
    }

    function searchByRR(searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      const cards = document.querySelectorAll('.lane-card');
      const noResults = document.getElementById('no-results');
      let visibleCount = 0;
      
      clearHighlights();

      if (term === '') {
        // Show all cards
        cards.forEach(card => {
          card.classList.remove('hidden');
          visibleCount++;
        });
        noResults.style.display = 'none';
        return;
      }

      cards.forEach(card => {
        const rrNumber = card.dataset.rr.toLowerCase();
        const searchText = card.dataset.search;
        
        if (rrNumber.includes(term) || searchText.includes(term)) {
          card.classList.remove('hidden');
          visibleCount++;
          
          // Auto-highlight if exact RR# match
          if (rrNumber === term) {
            card.classList.add('highlighted');
            highlightedCard = card;
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          card.classList.add('hidden');
        }
      });

      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // Clear dropdown after selection
    document.getElementById('lane-selector').addEventListener('change', function() {
      setTimeout(() => {
        this.value = '';
      }, 100);
    });

    // Allow Enter key to search
    document.getElementById('rr-search').addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        searchByRR(this.value);
      }
    });
  </script>
</body>
</html>`;
  
  return html;
}
