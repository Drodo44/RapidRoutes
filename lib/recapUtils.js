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
 * Generate selling points based on lane data
 * @param {Object} lane - Lane data
 * @returns {Array} - Array of selling points
 */
async function generateSellingPoints(lane) {
  const points = [];
  
  // Check for high-volume markets
  const highVolumeMarkets = [
    'Atlanta', 'Chicago', 'Dallas', 'Los Angeles', 'New York', 
    'Miami', 'Seattle', 'Houston', 'Philadelphia', 'Phoenix'
  ];
  
  const originHighVolume = highVolumeMarkets.some(market => 
    lane.origin_city?.toLowerCase().includes(market.toLowerCase())
  );
  
  const destHighVolume = highVolumeMarkets.some(market => 
    lane.dest_city?.toLowerCase().includes(market.toLowerCase())
  );
  
  if (originHighVolume) {
    points.push(`Strong outbound market from ${lane.origin_city} with multiple carrier options`);
  }
  
  if (destHighVolume) {
    points.push(`${lane.dest_city} is a major market with consistent demand for equipment`);
  }
  
  // Equipment-specific selling points
  const equipCode = lane.equipment_code?.toUpperCase();
  
  if (equipCode === 'R' || equipCode === 'IR') {
    points.push('Reefer rates typically command 15-20% premium over dry van');
    points.push('Temperature controlled freight is less susceptible to market fluctuations');
  }
  
  if (equipCode === 'F' || equipCode === 'FD' || equipCode === 'SD') {
    points.push('Flatbed capacity remains tight with specialized equipment requirements');
    points.push('Open deck freight commands higher rates due to driver expertise needed');
  }
  
  if (equipCode === 'V') {
    points.push('Consistent lane with established carrier relationships');
    points.push('Multiple carrier options provide competitive pricing');
  }
  
  // Return the most relevant points (limit to 5)
  return points.slice(0, 5);
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
