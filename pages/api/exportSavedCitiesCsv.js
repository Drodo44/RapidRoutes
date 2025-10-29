// pages/api/exportSavedCitiesCsv.js
// Export DAT CSV for lanes with saved city selections (one-to-one pairing)

import { DAT_HEADERS } from '../../lib/datCsvBuilder.js';

// Track used RR#s globally to ensure uniqueness across entire export
const usedRRNumbers = new Set();

// Generate unique RR# that's never been used in this export session
function generateUniqueReferenceId(baseRefId, attemptOffset = 0) {
  // Extract base number from RR##### format
  const match = baseRefId?.match(/RR(\d{5})/);
  let candidateNum;
  
  if (match) {
    const baseNum = parseInt(match[1], 10);
    candidateNum = baseNum + attemptOffset;
    
    // Ensure we stay in valid range (10000-99999)
    if (candidateNum > 99999) {
      candidateNum = 10000 + (candidateNum - 10000) % 90000;
    }
    if (candidateNum < 10000) {
      candidateNum = 10000;
    }
  } else {
    // Fallback: random in valid range
    candidateNum = 10000 + Math.floor(Math.random() * 90000);
  }
  
  const candidateRR = `RR${String(candidateNum).padStart(5, '0')}`;
  
  // If already used, try next number
  if (usedRRNumbers.has(candidateRR)) {
    return generateUniqueReferenceId(baseRefId, attemptOffset + 1);
  }
  
  // Mark as used and return
  usedRRNumbers.add(candidateRR);
  return candidateRR;
}

// Normalize state to 2-letter code (DAT requires exact 2-letter state codes)
function normalizeStateCode(state) {
  if (!state) return '';
  
  const stateStr = String(state).trim().toUpperCase();
  
  // If already 2 letters, return as-is
  if (stateStr.length === 2) return stateStr;
  
  // Map full state names to codes
  const stateMap = {
    'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
    'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
    'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
    'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
    'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
    'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
    'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
    'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
    'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
    'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
    'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
    'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
    'WISCONSIN': 'WI', 'WYOMING': 'WY', 'DISTRICT OF COLUMBIA': 'DC'
  };
  
  return stateMap[stateStr] || stateStr;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (error) {
    console.error('[exportSavedCitiesCsv] Failed to load supabase admin:', error);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Clear used RR# tracking at start of each export
    usedRRNumbers.clear();
    
    // Fetch all current lanes with saved city selections
    const { data: lanes, error } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .eq('lane_status', 'current')
      .not('saved_origin_cities', 'is', null)
      .not('saved_dest_cities', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[exportSavedCitiesCsv] Database query failed:', error);
      return res.status(500).json({ error: 'Failed to fetch lanes' });
    }

    if (!lanes || lanes.length === 0) {
      return res.status(422).json({ error: 'No lanes with saved city selections found' });
    }

    console.log(`[exportSavedCitiesCsv] Processing ${lanes.length} lanes with saved selections`);

    // Generate CSV rows
    const rows = [];
    
    for (const lane of lanes) {
      const originCities = lane.saved_origin_cities || [];
      const destCities = lane.saved_dest_cities || [];
      
      if (originCities.length === 0 || destCities.length === 0) continue;

      const baseRefId = lane.reference_id || lane.rr_number || `RR${String(10000 + Math.floor(Math.random() * 90000))}`;
      
      // One-to-one pairing
      const numPairs = Math.min(originCities.length, destCities.length);
      
      for (let i = 0; i < numPairs; i++) {
        const originCity = originCities[i];
        const destCity = destCities[i];
        
        // Create rows for both contact methods with UNIQUE RR# for each
        const contactMethods = ['Email', 'Primary Phone'];
        
        for (let contactIdx = 0; contactIdx < contactMethods.length; contactIdx++) {
          // Generate globally unique RR# for each row
          const attemptOffset = (i * 2) + contactIdx + 1;
          const pairRefId = generateUniqueReferenceId(baseRefId, attemptOffset);
          const contactMethod = contactMethods[contactIdx];
          
          const row = {
            'Pickup Earliest*': lane.pickup_earliest || '',
            'Pickup Latest': lane.pickup_latest || '',
            'Length (ft)*': lane.length_ft || '48',
            'Weight (lbs)*': lane.randomize_weight && lane.weight_min && lane.weight_max
              ? Math.floor(lane.weight_min + Math.random() * (lane.weight_max - lane.weight_min))
              : lane.weight_lbs || '45000',
            'Full/Partial*': lane.full_partial || 'Full',
            'Equipment*': lane.equipment_code || 'V',
            'Use Private Network*': 'No',
            'Private Network Rate': '',
            'Allow Private Network Booking': '',
            'Allow Private Network Bidding': '',
            'Use DAT Loadboard*': 'Yes',
            'DAT Loadboard Rate': '',
            'Allow DAT Loadboard Booking': 'Yes',
            'Use Extended Network': '',
            'Contact Method*': contactMethod,
            'Origin City*': originCity.city || '',
            'Origin State*': normalizeStateCode(originCity.state || originCity.state_or_province || ''),
            'Origin Postal Code': originCity.zip || '',
            'Destination City*': destCity.city || '',
            'Destination State*': normalizeStateCode(destCity.state || destCity.state_or_province || ''),
            'Destination Postal Code': destCity.zip || '',
            'Comment': lane.comment || '',
            'Commodity': lane.commodity || '',
            'Reference ID': pairRefId
          };
          
          rows.push(row);
        }
      }
    }

    if (rows.length === 0) {
      return res.status(422).json({ error: 'No valid rows generated from saved selections' });
    }

    console.log(`[exportSavedCitiesCsv] Generated ${rows.length} CSV rows from ${lanes.length} lanes`);

    // Convert to CSV format
    const csvLines = [];
    csvLines.push(DAT_HEADERS.join(','));
    
    for (const row of rows) {
      const values = DAT_HEADERS.map(header => {
        const val = row[header] || '';
        // Escape commas and quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      csvLines.push(values.join(','));
    }

    const csv = csvLines.join('\n');
    const filename = `DAT_RapidRoutes_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('[exportSavedCitiesCsv] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
