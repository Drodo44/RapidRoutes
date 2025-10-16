// pages/api/exportDatCsvSimple.js
import { format } from 'date-fns';
import { getLanesByIdsOrQuery } from '../../services/laneService.js';

// ✅ DAT Template Headers (exact order from your verified file)
const HEADERS = [
  'Pickup Earliest*',
  'Pickup Latest',
  'Length (ft)*',
  'Weight (lbs)*',
  'Full/Partial*',
  'Equipment*',
  'Use Private Network*',
  'Private Network Rate',
  'Allow Private Network Booking',
  'Allow Private Network Bidding',
  'Use DAT Loadboard*',
  'DAT Loadboard Rate',
  'Allow DAT Loadboard Booking',
  'Use Extended Network',
  'Contact Method*',
  'Origin City*',
  'Origin State*',
  'Origin Postal Code',
  'Destination City*',
  'Destination State*',
  'Destination Postal Code',
  'Comment',
  'Commodity',
  'Reference ID',
];

// ✅ Constants (DAT requires fixed answers for some fields)
const DEFAULTS = {
  usePrivateNetwork: 'NO',
  useDatLoadboard: 'YES',
  fullPartial: 'Full',
  lengthFt: 53,
};

// ✅ Date formatting for DAT (M/D/YYYY)
function fmtDate(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'M/d/yyyy');
  } catch {
    return '';
  }
}

// ✅ Normalize lane object from different sources (GET query vs POST body)
function normalizeLane(lane) {
  return {
    id: lane.id || lane.reference_id || '',
    reference_id: lane.reference_id || lane.id || '',
    origin_city: lane.origin_city || lane.originCity || '',
    origin_state: lane.origin_state || lane.originState || '',
    origin_zip: lane.origin_zip || lane.originZip || '',
    destination_city: lane.destination_city || lane.destinationCity || '',
    destination_state: lane.destination_state || lane.destinationState || '',
    destination_zip: lane.destination_zip || lane.destinationZip || '',
    equipment_code: lane.equipment_code || lane.equipment || '',
    pickup_date: lane.pickup_date || lane.pickupDate || new Date().toISOString(),
    pickup_earliest: lane.pickup_earliest || lane.pickupEarliest || lane.pickup_date || lane.pickupDate,
    pickup_latest: lane.pickup_latest || lane.pickupLatest || '',
    length_ft: lane.length_ft || lane.lengthFt || null,
    weight_lbs: lane.weight_lbs || lane.weightLbs || null,
    full_partial: lane.full_partial || lane.fullPartial || null,
    comment: lane.comment || '',
    commodity: lane.commodity || '',
  };
}

// ✅ Build one CSV row for a given lane + contact method
function rowForContactMethod(lane, contactMethod) {
  const normalized = normalizeLane(lane);
  const pickupEarliest = fmtDate(normalized.pickup_date || normalized.pickup_earliest);
  if (!pickupEarliest) return null; // required

  const pickupLatest = fmtDate(normalized.pickup_latest);

  return [
    pickupEarliest,                                 // Pickup Earliest*
    pickupLatest,                                   // Pickup Latest
    String(normalized.length_ft || DEFAULTS.lengthFt),    // Length (ft)*
    String(normalized.weight_lbs || ''),                  // Weight (lbs)* (entered or random)
    String(normalized.full_partial || DEFAULTS.fullPartial), // Full/Partial*
    String(normalized.equipment_code || ''),              // Equipment*
    DEFAULTS.usePrivateNetwork,                     // Use Private Network*
    '', '', '',                                     // Private network fields
    DEFAULTS.useDatLoadboard,                       // Use DAT Loadboard*
    '', '', '',                                     // DAT Loadboard + extended network
    contactMethod,                                  // Contact Method*
    String(normalized.origin_city || ''),                 // Origin City*
    String(normalized.origin_state || ''),                // Origin State*
    String(normalized.origin_zip || ''),                  // Origin Postal Code
    String(normalized.destination_city || ''),            // Destination City*
    String(normalized.destination_state || ''),           // Destination State*
    String(normalized.destination_zip || ''),             // Destination Postal Code
    String(normalized.comment || ''),                     // Comment
    String(normalized.commodity || ''),                   // Commodity
    String(normalized.reference_id || normalized.id || ''),     // Reference ID (RR#)
  ];
}

// ✅ Convert all rows to DAT CSV format
function toCsv(rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [];
  lines.push(HEADERS.map(escape).join(','));
  for (const r of rows) lines.push(r.map(escape).join(','));
  return lines.join('\r\n'); // DAT expects CRLF
}

// ✅ API Handler - Supports both GET and POST methods
export default async function handler(req, res) {
  // ✅ CORS headers for Google Apps Script / LM bridge
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let lanes = [];

    // ✅ POST: Accept JSON body with lanes array (Google Apps Script / LM bridge)
    if (req.method === 'POST') {
      const body = req.body;
      if (!body || !Array.isArray(body.lanes)) {
        return res.status(400).json({ 
          error: 'Invalid request body', 
          detail: 'Expected JSON with "lanes" array' 
        });
      }
      lanes = body.lanes;
      console.log(`📥 POST request received with ${lanes.length} lanes from body`);
    } 
    // ✅ GET: Fetch from database by IDs or limit (original behavior)
    else if (req.method === 'GET') {
      const ids = (req.query.ids || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      lanes = await getLanesByIdsOrQuery({ ids, limit: req.query.limit });
      console.log(`📥 GET request fetched ${lanes.length} lanes from database`);
    } else {
      res.setHeader('Allow', 'GET, POST, OPTIONS');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!lanes || lanes.length === 0) {
      return res.status(400).json({ 
        error: 'No lanes provided',
        detail: 'Request must include lanes via POST body or GET query parameters'
      });
    }

    const rows = [];
    const skipped = [];

    for (const lane of lanes) {
      const r1 = rowForContactMethod(lane, 'primary phone');
      const r2 = rowForContactMethod(lane, 'email');
      if (!r1 || !r2) {
        skipped.push(lane.reference_id || lane.id || 'unknown');
        continue;
      }
      rows.push(r1, r2);
    }

    if (rows.length === 0) {
      return res.status(400).json({ 
        error: 'No valid CSV rows generated',
        detail: 'All lanes were skipped (missing required fields like pickup date)',
        skipped
      });
    }

    const csv = toCsv(rows);
    
    // ✅ CSV response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="DAT_Postings.csv"');

    console.log(`✅ CSV generated: ${rows.length} rows from ${lanes.length} lanes`);

    if (skipped.length) {
      res.status(200).send(`${csv}\r\n# Skipped lanes: ${skipped.join(', ')}`);
    } else {
      res.status(200).send(csv);
    }
  } catch (err) {
    console.error('❌ DAT Export Error:', err);
    res.status(500).json({ error: 'DAT Export failed', detail: err.message });
  }
}
