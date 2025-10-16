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

// ✅ Build one CSV row for a given lane + contact method
function rowForContactMethod(lane, contactMethod) {
  const pickupEarliest = fmtDate(lane.pickup_date || lane.pickup_earliest);
  if (!pickupEarliest) return null; // required

  const pickupLatest = fmtDate(lane.pickup_latest);

  return [
    pickupEarliest,                                 // Pickup Earliest*
    pickupLatest,                                   // Pickup Latest
    String(lane.length_ft || DEFAULTS.lengthFt),    // Length (ft)*
    String(lane.weight_lbs || ''),                  // Weight (lbs)* (entered or random)
    String(lane.full_partial || DEFAULTS.fullPartial), // Full/Partial*
    String(lane.equipment_code || ''),              // Equipment*
    DEFAULTS.usePrivateNetwork,                     // Use Private Network*
    '', '', '',                                     // Private network fields
    DEFAULTS.useDatLoadboard,                       // Use DAT Loadboard*
    '', '', '',                                     // DAT Loadboard + extended network
    contactMethod,                                  // Contact Method*
    String(lane.origin_city || ''),                 // Origin City*
    String(lane.origin_state || ''),                // Origin State*
    String(lane.origin_zip || ''),                  // Origin Postal Code
    String(lane.destination_city || ''),            // Destination City*
    String(lane.destination_state || ''),           // Destination State*
    String(lane.destination_zip || ''),             // Destination Postal Code
    String(lane.comment || ''),                     // Comment
    String(lane.commodity || ''),                   // Commodity
    String(lane.reference_id || lane.id || ''),     // Reference ID (RR#)
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

// ✅ API Handler
export default async function handler(req, res) {
  try {
    const ids = (req.query.ids || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const lanes = await getLanesByIdsOrQuery({ ids, limit: req.query.limit });
    const rows = [];
    const skipped = [];

    for (const lane of lanes) {
      const r1 = rowForContactMethod(lane, 'primary phone');
      const r2 = rowForContactMethod(lane, 'email');
      if (!r1 || !r2) {
        skipped.push(lane.reference_id || lane.id);
        continue;
      }
      rows.push(r1, r2);
    }

    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="DAT_Postings.csv"');

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
