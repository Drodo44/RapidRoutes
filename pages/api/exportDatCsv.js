// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exact 24 headers
// - 22 rows per lane (base + 10 pairs, duplicated for contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient';
import { planPairsForLane, rowsFromBaseAndPairs, DAT_HEADERS, toCsv, chunkRows } from '../../lib/datCsvBuilder';

// EMERGENCY SIMPLE PAIR GENERATOR - FIXED VERSION
async function emergencyPairs(origin, dest) {
  try {
    // Find origin city exactly
    const { data: originData } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);
    
    // Find dest city exactly
    const { data: destData } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', dest.city)
      .ilike('state_or_province', dest.state)
      .limit(1);
    
    if (!originData?.[0] || !destData?.[0]) {
      console.error('EMERGENCY: Cities not found', origin, dest);
      return { pairs: [], baseOrigin: origin, baseDest: dest };
    }
    
    const originCity = originData[0];
    const destCity = destData[0];
    
    console.log('EMERGENCY: Found cities', originCity.city, destCity.city);
    
    console.log('EMERGENCY: Origin coordinates:', originCity.latitude, originCity.longitude);
    console.log('EMERGENCY: Dest coordinates:', destCity.latitude, destCity.longitude);
    
    // Get actual nearby cities using proper distance calculation
    const { data: allCities } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(2000);
    
    if (!allCities || allCities.length === 0) {
      console.error('EMERGENCY: No cities with coordinates found');
      return { pairs: [], baseOrigin: { city: originCity.city, state: originCity.state_or_province, zip: originCity.zip || '' }, baseDest: { city: destCity.city, state: destCity.state_or_province, zip: destCity.zip || '' } };
    }
    
    console.log(`EMERGENCY: Retrieved ${allCities.length} cities for distance calculation`);
    
    // Calculate actual distances and find nearby cities
    function distance(lat1, lon1, lat2, lon2) {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
    
    // Find cities within 100 miles of origin
    const nearOrigins = [];
    if (originCity.latitude && originCity.longitude) {
      for (const city of allCities) {
        if (!city.latitude || !city.longitude) continue;
        const dist = distance(originCity.latitude, originCity.longitude, city.latitude, city.longitude);
        if (dist > 0 && dist <= 100 && city.state_or_province !== originCity.state_or_province) {
          nearOrigins.push({ ...city, distance: dist });
        }
      }
    }
    
    // Find cities within 100 miles of destination
    const nearDests = [];
    if (destCity.latitude && destCity.longitude) {
      for (const city of allCities) {
        if (!city.latitude || !city.longitude) continue;
        const dist = distance(destCity.latitude, destCity.longitude, city.latitude, city.longitude);
        if (dist > 0 && dist <= 100 && city.state_or_province !== destCity.state_or_province) {
          nearDests.push({ ...city, distance: dist });
        }
      }
    }
    
    console.log(`EMERGENCY: Found ${nearOrigins.length} near origins, ${nearDests.length} near dests`);
    
    // Sort by distance and take closest
    nearOrigins.sort((a, b) => a.distance - b.distance);
    nearDests.sort((a, b) => a.distance - b.distance);
    
    // Generate exactly 5 pairs
    const pairs = [];
    for (let i = 0; i < 5; i++) {
      const o = nearOrigins[i] || nearOrigins[i % nearOrigins.length] || originCity;
      const d = nearDests[i] || nearDests[i % nearDests.length] || destCity;
      
      pairs.push({
        pickup: { city: o.city, state: o.state_or_province, zip: o.zip || '' },
        delivery: { city: d.city, state: d.state_or_province, zip: d.zip || '' }
      });
    }
    
    console.log('EMERGENCY: Generated pairs:', pairs.map(p => `${p.pickup.city},${p.pickup.state} -> ${p.delivery.city},${p.delivery.state}`));
    
    return {
      pairs,
      baseOrigin: { city: originCity.city, state: originCity.state_or_province, zip: originCity.zip || '' },
      baseDest: { city: destCity.city, state: destCity.state_or_province, zip: destCity.zip || '' }
    };
    
  } catch (error) {
    console.error('Emergency pairs error:', error);
    return { pairs: [], baseOrigin: origin, baseDest: dest };
  }
}

function daysAgoUTC(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

async function selectLanes({ pending, days, all }) {
  let q = adminSupabase.from('lanes').select('*').order('created_at', { ascending: false });

  if (pending) {
    q = q.eq('status', 'pending');
  } else if (all) {
    // no additional filters
  } else if (days != null) {
    const since = daysAgoUTC(Number(days));
    q = q.gte('created_at', since);
  } else {
    // default: pending
    q = q.eq('status', 'pending');
  }

  const { data, error } = await q.limit(2000); // sane cap; bulk export should not exceed this
  if (error) throw error;
  return data || [];
}

async function buildAllRows(lanes, preferFillTo10) {
  const allRows = [];
  console.log(`BULK EXPORT: Processing ${lanes.length} lanes with preferFillTo10=${preferFillTo10}`);
  
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    try {
      console.log(`BULK EXPORT: Processing lane ${i+1}/${lanes.length}: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
      
      let crawl, rows;
      
      if (preferFillTo10) {
        // EMERGENCY MODE: Use simple pair generation
        console.log(`BULK EXPORT: Using EMERGENCY mode for lane ${i+1}`);
        crawl = await emergencyPairs(
          { city: lane.origin_city, state: lane.origin_state },
          { city: lane.dest_city, state: lane.dest_state }
        );
        
        console.log(`EMERGENCY DEBUG: Lane ${i+1} crawl result:`, {
          baseOrigin: crawl.baseOrigin,
          baseDest: crawl.baseDest,
          pairsCount: crawl.pairs.length,
          pairs: crawl.pairs
        });
        
        // Generate rows manually for emergency mode
        const postings = [
          { pickup: crawl.baseOrigin, delivery: crawl.baseDest },
          ...crawl.pairs.map(p => ({ pickup: p.pickup, delivery: p.delivery }))
        ];
        
        console.log(`EMERGENCY DEBUG: Lane ${i+1} will generate ${postings.length} postings (should be 6)`);
        
        rows = [];
        for (const posting of postings) {
          // Calculate weight for this row
          let rowWeight;
          if (lane.randomize_weight && lane.weight_min && lane.weight_max) {
            rowWeight = Math.floor(Math.random() * (lane.weight_max - lane.weight_min + 1)) + lane.weight_min;
          } else {
            rowWeight = lane.weight_lbs || 45000; // Use actual weight or sensible default
          }
          
          // Email contact
          rows.push({
            'Pickup Earliest*': lane.pickup_earliest,
            'Pickup Latest': lane.pickup_latest,
            'Length (ft)*': String(lane.length_ft),
            'Weight (lbs)*': String(rowWeight),
            'Full/Partial*': lane.full_partial || 'full',
            'Equipment*': lane.equipment_code,
            'Use Private Network*': 'yes',
            'Private Network Rate': '',
            'Allow Private Network Booking': 'no',
            'Allow Private Network Bidding': 'no',
            'Use DAT Loadboard*': 'yes',
            'DAT Loadboard Rate': '',
            'Allow DAT Loadboard Booking': 'no',
            'Use Extended Network': 'yes',
            'Contact Method*': 'email',
            'Origin City*': posting.pickup.city,
            'Origin State*': posting.pickup.state,
            'Origin Postal Code': posting.pickup.zip || '',
            'Destination City*': posting.delivery.city,
            'Destination State*': posting.delivery.state,
            'Destination Postal Code': posting.delivery.zip || '',
            'Comment': lane.comment || '',
            'Commodity': lane.commodity || ''
          });
          
          // Primary phone contact
          rows.push({
            'Pickup Earliest*': lane.pickup_earliest,
            'Pickup Latest': lane.pickup_latest,
            'Length (ft)*': String(lane.length_ft),
            'Weight (lbs)*': String(rowWeight),
            'Full/Partial*': lane.full_partial || 'full',
            'Equipment*': lane.equipment_code,
            'Use Private Network*': 'yes',
            'Private Network Rate': '',
            'Allow Private Network Booking': 'no',
            'Allow Private Network Bidding': 'no',
            'Use DAT Loadboard*': 'yes',
            'DAT Loadboard Rate': '',
            'Allow DAT Loadboard Booking': 'no',
            'Use Extended Network': 'yes',
            'Contact Method*': 'primary phone',
            'Origin City*': posting.pickup.city,
            'Origin State*': posting.pickup.state,
            'Origin Postal Code': posting.pickup.zip || '',
            'Destination City*': posting.delivery.city,
            'Destination State*': posting.delivery.state,
            'Destination Postal Code': posting.delivery.zip || '',
            'Comment': lane.comment || '',
            'Commodity': lane.commodity || ''
          });
        }
        
      } else {
        // Normal mode
        crawl = await planPairsForLane(lane, { preferFillTo10 });
        rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, preferFillTo10);
      }
      
      console.log(`BULK EXPORT: Lane ${i+1} crawl result - pairs: ${crawl.pairs?.length || 0}`);
      console.log(`BULK EXPORT: Lane ${i+1} generated ${rows.length} rows (expected: ${preferFillTo10 ? 12 : 6})`);
      console.log(`BULK EXPORT: Lane ${i+1} rows breakdown - base + ${crawl.pairs?.length || 0} pairs = ${1 + (crawl.pairs?.length || 0)} postings × 2 contacts = ${(1 + (crawl.pairs?.length || 0)) * 2} rows`);
      allRows.push(...rows);
    } catch (laneError) {
      console.error(`BULK EXPORT: Error processing lane ${i+1} (${lane.id}):`, laneError);
      // Skip this lane but continue with others
      continue;
    }
  }
  
  console.log(`BULK EXPORT: Total rows generated: ${allRows.length}`);
  return allRows;
}

export default async function handler(req, res) {
  const method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const preferFillTo10 = String(req.query.fill || '0') === '1';
  const pending = String(req.query.pending || '') === '1';
  const all = String(req.query.all || '') === '1';
  const days = req.query.days != null ? Number(req.query.days) : null;
  const partParam = req.query.part != null ? Number(req.query.part) : null;

  try {
    const lanes = await selectLanes({ pending, days, all });
    // Build all rows (22/lane)
    const allRows = await buildAllRows(lanes, preferFillTo10);
    const chunks = chunkRows(allRows, 499);

    // HEAD: return total parts
    if (method === 'HEAD') {
      res.setHeader('X-Total-Parts', String(chunks.length || 1));
      return res.status(200).end();
    }

    // GET: if part specified, stream that part; else if >1, default to part 1
    let partIndex = 0;
    if (Number.isFinite(partParam) && partParam > 0 && partParam <= chunks.length) {
      partIndex = partParam - 1;
    }

    const selected = chunks[partIndex] || allRows;
    const csv = toCsv(DAT_HEADERS, selected);

    // Debug headers for client inspection
    res.setHeader('X-Debug-Lanes-Processed', String(lanes.length));
    res.setHeader('X-Debug-Total-Rows', String(allRows.length));
    res.setHeader('X-Debug-Fill-Mode', String(preferFillTo10));
    res.setHeader('X-Debug-Selected-Rows', String(selected.length));

    const baseName = pending ? 'DAT_Pending' : all ? 'DAT_All' : days != null ? `DAT_Last${days}d` : 'DAT_Pending';
    const filename =
      (chunks.length > 1)
        ? `${baseName}_part${partIndex + 1}-of-${chunks.length}.csv`
        : `${baseName}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    if (chunks.length > 1) {
      res.setHeader('X-Total-Parts', String(chunks.length));
    }

    return res.status(200).send(csv);
  } catch (err) {
    console.error('GET/HEAD /api/exportDatCsv error:', err);
    if (method === 'HEAD') {
      return res.status(500).end();
    }
    return res.status(500).json({ error: err.message || 'Failed to export CSV' });
  }
}
