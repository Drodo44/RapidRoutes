// lib/recapUtils.js
/**
 * Utility for generating recap HTML from lane data
 */

/**
 * Generates HTML for a lane recap
 * @param {Object} lane - Lane data
 * @returns {Object} - HTML and metadata
 */
export async function generateRecapHTML(lane) {
  // Format pickup dates
  const pickupEarliest = lane.pickup_earliest ? new Date(lane.pickup_earliest).toLocaleDateString() : 'Not specified';
  const pickupLatest = lane.pickup_latest ? new Date(lane.pickup_latest).toLocaleDateString() : 'Not specified';
  
  // Format weight
  let weightDisplay = '';
  if (lane.randomize_weight) {
    weightDisplay = `${lane.weight_min || 0} - ${lane.weight_max || 0} lbs (randomized)`;
  } else {
    weightDisplay = `${lane.weight_lbs || 0} lbs`;
  }
  
  // Generate selling points
  const sellingPoints = await generateSellingPoints(lane);
  
  // Build HTML
  const html = `
    <div class="recap-container">
      <div class="recap-header">
        <h2 class="recap-title">${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}</h2>
        <div class="recap-equipment">${getEquipmentLabel(lane.equipment_code)}</div>
      </div>
      
      <div class="recap-details">
        <div class="recap-section">
          <h3>Shipment Details</h3>
          <table class="recap-table">
            <tr>
              <td>Equipment:</td>
              <td>${getEquipmentLabel(lane.equipment_code)}</td>
            </tr>
            <tr>
              <td>Weight:</td>
              <td>${weightDisplay}</td>
            </tr>
            <tr>
              <td>Length:</td>
              <td>${lane.length_ft} ft</td>
            </tr>
            <tr>
              <td>Load Type:</td>
              <td>${lane.full_partial === 'partial' ? 'Partial' : 'Full'}</td>
            </tr>
            <tr>
              <td>Pickup Window:</td>
              <td>${pickupEarliest} - ${pickupLatest}</td>
            </tr>
            ${lane.commodity ? `<tr><td>Commodity:</td><td>${lane.commodity}</td></tr>` : ''}
          </table>
        </div>
        
        ${sellingPoints.length > 0 ? `
        <div class="recap-section">
          <h3>Selling Points</h3>
          <ul class="selling-points">
            ${sellingPoints.map(point => `<li>${point}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${lane.comment ? `
        <div class="recap-section">
          <h3>Additional Notes</h3>
          <p>${lane.comment}</p>
        </div>
        ` : ''}
      </div>
      
      <div class="recap-footer">
        <p>Generated on ${new Date().toLocaleDateString()} - RapidRoutes</p>
      </div>
    </div>
  `;
  
  return {
    html,
    sellingPoints
  };
}

/**
 * Generate actionable selling points based on lane data
 * @param {Object} lane - Lane data
 * @returns {Array} - Array of broker-specific selling points
 */
async function generateSellingPoints(lane) {
  const points = [];
  const equipCode = lane.equipment_code?.toUpperCase();
  const weightLbs = lane.weight_lbs || (lane.weight_min + lane.weight_max) / 2 || 0;
  
  // Weight-based selling points
  if (weightLbs > 45000) {
    points.push(`Heavy haul at ${Math.round(weightLbs).toLocaleString()} lbs - premium rates justify specialized carriers`);
    points.push('Oversized load expertise required - fewer qualified carriers = higher margins');
  } else if (weightLbs < 10000) {
    points.push(`Light load at ${Math.round(weightLbs).toLocaleString()} lbs - LTL consolidation opportunity`);
    points.push('Partial load flexibility allows for quick carrier matching');
  }
  
  // Equipment-specific broker selling points
  if (equipCode === 'R' || equipCode === 'IR') {
    points.push('Reefer freight: 20-30% rate premium over dry van with temp control requirements');
    points.push('Cold chain logistics expertise - position as specialized service');
    points.push('Temperature monitoring adds value - justify higher rates to shippers');
  }
  
  if (equipCode === 'F' || equipCode === 'FD' || equipCode === 'SD') {
    points.push('Flatbed capacity shortage: 15-25% premium over van rates in current market');
    points.push('Securing & tarping expertise required - fewer available carriers');
    points.push('Weather-dependent booking urgency creates pricing power');
  }
  
  if (equipCode === 'V') {
    points.push('High-volume van lane: leverage carrier partnerships for competitive rates');
    points.push('Standard equipment allows flexible carrier pool and rapid placement');
  }
  
  // Route-specific selling points
  const route = `${lane.origin_state} to ${lane.dest_state}`;
  const crossCountry = Math.abs(getStateDistance(lane.origin_state, lane.dest_state)) > 1000;
  
  if (crossCountry) {
    points.push(`Cross-country ${route} run: team drivers command $0.15-0.25/mile premium`);
    points.push('Long-haul efficiency: fewer stops = reduced detention risk');
  }
  
  // Timing-based selling points
  const pickupDate = new Date(lane.pickup_earliest);
  const daysOut = Math.ceil((pickupDate - new Date()) / (1000 * 60 * 60 * 24));
  
  if (daysOut <= 2) {
    points.push(`URGENT: ${daysOut}-day pickup window creates carrier urgency = rate leverage`);
  } else if (daysOut >= 7) {
    points.push(`Advance booking advantage: ${daysOut} days out allows optimal carrier selection`);
  }
  
  // Full/Partial load strategy
  if (lane.full_partial === 'partial') {
    points.push('Partial load: consolidation potential with other freight for margin optimization');
    points.push('LTL alternative positioning: faster transit than ground carriers');
  } else {
    points.push('Dedicated truck: premium service positioning vs shared loads');
  }
  
  // Return the most actionable points (limit to 6)
  return points.slice(0, 6);
}

// Helper function to estimate distance between states (simplified)
function getStateDistance(state1, state2) {
  const stateCoords = {
    'AL': [-86.8, 32.8], 'AK': [-150, 64], 'AZ': [-111.9, 34.2], 'AR': [-92.2, 34.7],
    'CA': [-119.8, 36.8], 'CO': [-105.5, 39.0], 'CT': [-72.7, 41.6], 'DE': [-75.5, 39.3],
    'FL': [-81.6, 27.8], 'GA': [-83.1, 32.2], 'HI': [-157.8, 21.3], 'ID': [-114.7, 44.1],
    'IL': [-89.4, 40.3], 'IN': [-86.1, 39.8], 'IA': [-93.1, 41.6], 'KS': [-96.7, 38.5],
    'KY': [-84.9, 37.7], 'LA': [-91.8, 30.9], 'ME': [-69.8, 44.3], 'MD': [-76.5, 39.0],
    'MA': [-71.5, 42.2], 'MI': [-84.5, 43.3], 'MN': [-93.9, 45.4], 'MS': [-89.7, 32.7],
    'MO': [-92.2, 38.5], 'MT': [-110.5, 47.1], 'NE': [-99.9, 41.1], 'NV': [-117, 39.8],
    'NH': [-71.5, 43.4], 'NJ': [-74.5, 40.3], 'NM': [-106.2, 34.8], 'NY': [-74.9, 42.2],
    'NC': [-79.8, 35.6], 'ND': [-99.8, 47.5], 'OH': [-82.7, 40.3], 'OK': [-97.1, 35.4],
    'OR': [-122.1, 44.9], 'PA': [-77.2, 40.3], 'RI': [-71.4, 41.7], 'SC': [-80.9, 33.8],
    'SD': [-99.4, 44.3], 'TN': [-86.7, 35.7], 'TX': [-97.6, 31.1], 'UT': [-111.9, 40.1],
    'VT': [-72.6, 44.0], 'VA': [-78.2, 37.7], 'WA': [-121.1, 47.4], 'WV': [-80.9, 38.5],
    'WI': [-90.0, 44.3], 'WY': [-107.3, 42.7]
  };
  
  const coord1 = stateCoords[state1];
  const coord2 = stateCoords[state2];
  
  if (!coord1 || !coord2) return 500; // Default moderate distance
  
  const dx = coord1[0] - coord2[0];
  const dy = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy) * 69; // Rough miles conversion
}

/**
 * Map equipment codes to full labels
 */
function getEquipmentLabel(code) {
  const equipmentMap = {
    'V': 'Dry Van',
    'R': 'Refrigerated',
    'F': 'Flatbed',
    'SD': 'Step Deck',
    'DD': 'Double Drop',
    'RGN': 'Removable Gooseneck',
    'LB': 'Lowboy',
    'PO': 'Power Only',
    'HE': 'Hotshot',
    'CON': 'Container',
    'AC': 'Auto Carrier',
    'FD': 'Flatbed with Drybox Option'
  };
  
  return equipmentMap[code] || code || 'Unknown';
}
