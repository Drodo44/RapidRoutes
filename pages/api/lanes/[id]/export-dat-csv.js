// ============================================================================
// DAT CSV Export API - Generate DAT bulk upload CSV from selected cities
// ============================================================================
// Purpose: Export selected city pairs to DAT-compliant CSV format
// Business Rules:
// - Each origin×destination pair = 2 rows (Email + Primary Phone)
// - 24 exact DAT headers in specific order
// - RR number in Reference ID column
// - Weight randomization if toggled
// - 499-row maximum per file (auto-chunk if needed)
// ============================================================================

import { DAT_HEADERS } from '../../../../lib/datHeaders';
import { withAuth } from '../../../../middleware/authMiddleware';

// Equipment weight limits (from datCsvBuilder.js)
const EQUIPMENT_WEIGHT_LIMITS = {
  'V': 45000, 'DRY': 45000, 'BOX': 45000, 'SPRV': 45000, 'POV': 45000,
  'R': 43500, 'REEF': 43500, 'RFS': 43500, 'RVENT': 43500, 'FOOD': 43500, 'ICE': 43500, 'PHA': 43500,
  'FD': 48000, 'F': 48000, 'FT': 48000, 'SD': 48000, 'STEP': 48000, 'DD': 48000, 
  'RGN': 48000, 'LBY': 48000, 'STRETCHF': 48000, 'STRETCHSD': 48000, 
  'CONEST': 48000, 'CURT': 48000, 'PIPE': 48000, 'GLS': 48000, 
  'COIL': 48000, 'BRICK': 48000, 'STEEL': 48000, 'LUM': 48000
};

/**
 * Format date as MM/DD/YYYY for DAT
 */
function formatDatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US');
}

/**
 * Generate random weight within range
 */
function getRandomWeight(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Escape CSV field (wrap in quotes if contains comma/quote)
 */
function escapeCsvField(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a single DAT CSV row
 */
function buildDatRow(lane, originCity, destCity, contactMethod, rrNumber) {
  // Generate weight (randomize if toggled)
  let weight;
  if (lane.randomize_weight) {
    const min = Number(lane.weight_min) || 46000;
    const max = Number(lane.weight_max) || 48000;
    weight = getRandomWeight(min, max);
  } else {
    weight = Number(lane.weight_lbs) || 48000;
  }

  // Format dates
  const pickupEarliest = formatDatDate(lane.pickup_earliest);
  const pickupLatest = formatDatDate(lane.pickup_latest);

  // Build row matching exact DAT header order
  const row = {
    'Pickup Earliest*': pickupEarliest,
    'Pickup Latest': pickupLatest,
    'Length (ft)*': String(lane.length_ft || 53),
    'Weight (lbs)*': String(weight),
    'Full/Partial*': lane.full_partial === 'partial' ? 'partial' : 'full',
    'Equipment*': lane.equipment_code,
    'Use Private Network*': 'yes',
    'Private Network Rate': '',
    'Allow Private Network Booking': 'yes',
    'Allow Private Network Bidding': 'yes',
    'Use DAT Loadboard*': 'yes',
    'DAT Loadboard Rate': '',
    'Allow DAT Loadboard Booking': 'yes',
    'Use Extended Network': 'no',
    'Contact Method*': contactMethod, // 'email' or 'primary phone'
    'Origin City*': originCity.city,
    'Origin State*': originCity.state_or_province,
    'Origin Postal Code': originCity.zip || '',
    'Destination City*': destCity.city,
    'Destination State*': destCity.state_or_province,
    'Destination Postal Code': destCity.zip || '',
    'Comment': lane.comment || '',
    'Commodity': lane.commodity || '',
    'Reference ID': rrNumber
  };

  return row;
}

/**
 * Convert rows to CSV string
 */
function rowsToCsv(rows) {
  if (rows.length === 0) return '';

  // Use exact DAT headers
  const headers = DAT_HEADERS;
  const headerLine = headers.map(escapeCsvField).join(',');
  
  const dataLines = rows.map(row => {
    return headers.map(header => escapeCsvField(row[header])).join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

/**
 * Main export handler
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    
    // Extract user from request (added by withAuth middleware)
    const user = req.user;
    console.log(`👤 User ${user.email} exporting DAT CSV for lane ${id}...`);
    
    // 1. Get lane data
    console.log(`📥 Fetching lane ${id} for DAT CSV export...`);
    const { data: lane, error: laneError } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .eq('id', id)
      .single();

    if (laneError || !lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    // 2. Get selected city pairs
    console.log(`📥 Fetching city selections for lane ${id}...`);
    const { data: cityChoice, error: choiceError } = await supabase
      .from('lane_city_choices')
      .select('origin_chosen_cities, dest_chosen_cities, rr_number')
      .eq('lane_id', id)
      .single();

    if (choiceError || !cityChoice) {
      return res.status(404).json({ 
        error: 'No city selections found. Please choose cities first.',
        details: 'Visit the Choose Cities page to select origin and destination cities.'
      });
    }

    // 3. Validate selections
    const originCities = cityChoice.origin_chosen_cities || [];
    const destCities = cityChoice.dest_chosen_cities || [];

    if (originCities.length === 0 || destCities.length === 0) {
      return res.status(400).json({
        error: 'No cities selected',
        details: `Found ${originCities.length} origin cities and ${destCities.length} destination cities. Please select at least one of each.`
      });
    }

    console.log(`✅ Found ${originCities.length} origin × ${destCities.length} destination cities = ${originCities.length * destCities.length} pairs`);

    // 4. Validate weight against equipment limits
    const equipmentLimit = EQUIPMENT_WEIGHT_LIMITS[lane.equipment_code] || 48000;
    if (lane.randomize_weight) {
      if (Number(lane.weight_max) > equipmentLimit) {
        return res.status(400).json({
          error: `Maximum weight ${lane.weight_max} exceeds ${lane.equipment_code} limit of ${equipmentLimit} lbs`
        });
      }
    } else {
      if (Number(lane.weight_lbs) > equipmentLimit) {
        return res.status(400).json({
          error: `Weight ${lane.weight_lbs} exceeds ${lane.equipment_code} limit of ${equipmentLimit} lbs`
        });
      }
    }

    // 5. Generate all rows (2 per pair: Email + Primary Phone)
    const rows = [];
    const contactMethods = ['email', 'primary phone'];

    for (const originCity of originCities) {
      for (const destCity of destCities) {
        for (const contactMethod of contactMethods) {
          const row = buildDatRow(lane, originCity, destCity, contactMethod, cityChoice.rr_number);
          rows.push(row);
        }
      }
    }

    console.log(`✅ Generated ${rows.length} DAT CSV rows (${originCities.length}×${destCities.length} pairs × 2 contact methods)`);

    // 6. Check if chunking is needed (499 rows max per file)
    if (rows.length > 499) {
      console.warn(`⚠️  Generated ${rows.length} rows, which exceeds DAT's 499-row limit. Chunking required.`);
      // For now, just take first 499 rows
      // TODO: Implement multi-file ZIP download
      const firstChunk = rows.slice(0, 499);
      const csvContent = rowsToCsv(firstChunk);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="DAT_Lane_${id}_Part1of${Math.ceil(rows.length / 499)}.csv"`);
      res.setHeader('X-Total-Rows', String(rows.length));
      res.setHeader('X-Chunk-Info', `1 of ${Math.ceil(rows.length / 499)}`);
      
      return res.status(200).send(csvContent);
    }

    // 7. Generate CSV
    const csvContent = rowsToCsv(rows);

    // 8. Send as download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="DAT_Lane_${id}_${new Date().toISOString().slice(0, 10)}.csv"`);
    
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('❌ DAT CSV export failed:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Internal server error during CSV generation'
    });
  }
}

// Export handler wrapped with authentication middleware
export default withAuth(handler, { requireAuth: true });
