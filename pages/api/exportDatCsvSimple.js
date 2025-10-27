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

/**
 * ✅ Enrich lane with KMA data and ZIP codes from canonical 'cities' table
 * This function uses ONLY the cities table for location enrichment.
 * dat_loads_2025 is queried separately for volume analytics only.
 */
async function enrichLaneWithCitiesData(lane) {
  try {
    // Only enrich if we have basic city/state info but missing detailed data
    const needsEnrichment = (
      lane.origin_city && 
      lane.origin_state && 
      lane.destination_city && 
      lane.destination_state &&
      (!lane.origin_kma_code || !lane.origin_zip || !lane.destination_kma_code || !lane.destination_zip)
    );

    if (!needsEnrichment) {
      console.log(`✅ Lane already has complete data, skipping enrichment`);
      return lane; // Already has sufficient data
    }

    console.log(`🔍 Enriching lane from cities table: ${lane.origin_city}, ${lane.origin_state} → ${lane.destination_city}, ${lane.destination_state}`);

    // ✅ CANONICAL SOURCE: cities table lookup for origin
    const { data: originCity, error: originError } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude')
      .ilike('city', lane.origin_city)
      .eq('state_or_province', lane.origin_state)
      .not('kma_code', 'is', null) // Ensure KMA is present
      .limit(1)
      .single();

    if (originError && originError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Origin city lookup error:', originError);
    }

    // ✅ CANONICAL SOURCE: cities table lookup for destination
    const { data: destCity, error: destError } = await supabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code, kma_name, latitude, longitude')
      .ilike('city', lane.destination_city)
      .eq('state_or_province', lane.destination_state)
      .not('kma_code', 'is', null) // Ensure KMA is present
      .limit(1)
      .single();

    if (destError && destError.code !== 'PGRST116') {
      console.error('❌ Destination city lookup error:', destError);
    }

    // Enrich origin data from cities table
    if (originCity) {
      lane.origin_kma_code = originCity.kma_code;
      lane.origin_kma_name = originCity.kma_name;
      lane.origin_latitude = originCity.latitude;
      lane.origin_longitude = originCity.longitude;
      if (!lane.origin_zip) lane.origin_zip = originCity.zip;
      console.log(`✅ Origin enriched: ${originCity.city}, ${originCity.state_or_province} → KMA: ${originCity.kma_code}, ZIP: ${originCity.zip}`);
    } else {
      console.warn(`⚠️ No cities table match found for origin: ${lane.origin_city}, ${lane.origin_state}`);
    }

    // Enrich destination data from cities table
    if (destCity) {
      lane.destination_kma_code = destCity.kma_code;
      lane.destination_kma_name = destCity.kma_name;
      lane.destination_latitude = destCity.latitude;
      lane.destination_longitude = destCity.longitude;
      if (!lane.destination_zip) lane.destination_zip = destCity.zip;
      console.log(`✅ Destination enriched: ${destCity.city}, ${destCity.state_or_province} → KMA: ${destCity.kma_code}, ZIP: ${destCity.zip}`);
    } else {
      console.warn(`⚠️ No cities table match found for destination: ${lane.destination_city}, ${lane.destination_state}`);
    }

    // Add enrichment metadata
    lane._enrichment = {
      source: 'cities_table_canonical',
      origin_enriched: !!originCity,
      destination_enriched: !!destCity,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Cities table enrichment complete`);

    return lane;

  } catch (err) {
    console.error('❌ Cities table enrichment error:', err.message);
    return lane; // Return original lane if enrichment fails
  }
}

/**
 * ✅ Optional: Query dat_loads_2025 for volume analytics only
 * This is separate from location enrichment and only used for statistics
 */
async function getVolumeAnalytics(lane) {
  try {
    if (!lane.origin_city || !lane.destination_city) {
      return null;
    }

    const { data: matchingLanes, error } = await supabase
      .from('dat_loads_2025')
      .select('Weight (lbs), DAT Used Miles, Customer Mileage, Equipment')
      .ilike('Origin City', lane.origin_city)
      .ilike('Origin State', lane.origin_state)
      .ilike('Destination City', lane.destination_city)
      .ilike('Destination State', lane.destination_state)
      .limit(50);

    if (error || !matchingLanes || matchingLanes.length === 0) {
      return null;
    }

    // Calculate average volume statistics
    const avgWeight = matchingLanes
      .filter(l => l['Weight (lbs)'])
      .reduce((sum, l) => sum + (l['Weight (lbs)'] || 0), 0) / matchingLanes.length;
    
    const avgMiles = matchingLanes
      .filter(l => l['DAT Used Miles'] || l['Customer Mileage'])
      .reduce((sum, l) => sum + (l['DAT Used Miles'] || l['Customer Mileage'] || 0), 0) / matchingLanes.length;

    return {
      matchingLanes: matchingLanes.length,
      avgWeight: Math.round(avgWeight),
      avgMiles: Math.round(avgMiles),
      source: 'dat_loads_2025_analytics_only'
    };

  } catch (err) {
    console.error('❌ Volume analytics error:', err.message);
    return null;
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
      
      // ✅ Enrich lanes with KMA data and ZIP codes from canonical cities table
      console.log(`🔍 Enriching ${lanes.length} lanes from cities table (canonical source)...`);
      lanes = await Promise.all(
        lanes.map(async (lane) => {
          const normalized = normalizeLane(lane);
          const enriched = await enrichLaneWithCitiesData(normalized);
          
          // Optional: Add volume analytics from dat_loads_2025 (analytics only, not for location)
          const analytics = await getVolumeAnalytics(enriched);
          if (analytics) {
            enriched._analytics = analytics;
          }
          
          return enriched;
        })
      );
      console.log(`✅ Cities table enrichment complete for ${lanes.length} lanes`);
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
