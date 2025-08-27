// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exact 24 headers
// - 22 rows per lane (base + 10 pairs, duplicated for contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient';
import { generateAllPairs } from '../../lib/datcrawl.js';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { planPairsForLane, rowsFromBaseAndPairs, toCsv, chunkRows } from '../../lib/datCsvBuilder';

// EMERGENCY PAIR GENERATOR - USING YOUR ACTUAL DATABASE
async function emergencyPairs(origin, dest) {
  try {
    console.log(`EMERGENCY: Generating pairs for ${origin.city}, ${origin.state} -> ${dest.city}, ${dest.state}`);
    
    // Find origin city in YOUR database
    const { data: originCities } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', origin.city)
      .ilike('state_or_province', origin.state)
      .limit(1);
    
    // Find destination city in YOUR database  
    const { data: destCities } = await adminSupabase
      .from('cities')
      .select('*')
      .ilike('city', dest.city)
      .ilike('state_or_province', dest.state)
      .limit(1);
    
    if (!originCities?.[0] || !destCities?.[0]) {
      console.error('EMERGENCY: Origin or dest city not found in database');
      return { 
        pairs: [], 
        baseOrigin: { city: origin.city, state: origin.state, zip: '' }, 
        baseDest: { city: dest.city, state: dest.state, zip: '' } 
      };
    }
    
    const originCity = originCities[0];
    const destCity = destCities[0];
    
    console.log(`EMERGENCY: Found origin: ${originCity.city}, ${originCity.state_or_province}, KMA: ${originCity.kma_code}`);
    console.log(`EMERGENCY: Found dest: ${destCity.city}, ${destCity.state_or_province}, KMA: ${destCity.kma_code}`);
    
    // Get nearby cities for origin (within same KMA or adjacent KMAs)
    const { data: nearOrigins } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code')
      .neq('city', originCity.city)
      .neq('state_or_province', originCity.state_or_province) // Different state for diversity
      .not('latitude', 'is', null) // Only cities with coordinates
      .limit(100);
    
    // Get nearby cities for destination
    const { data: nearDests } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, zip, kma_code')
      .neq('city', destCity.city)
      .neq('state_or_province', destCity.state_or_province) // Different state for diversity
      .not('latitude', 'is', null) // Only cities with coordinates
      .limit(100);
    
    console.log(`EMERGENCY: Found ${nearOrigins?.length || 0} potential origin alternatives`);
    console.log(`EMERGENCY: Found ${nearDests?.length || 0} potential dest alternatives`);
    
    if (!nearOrigins?.length || !nearDests?.length) {
      console.error('EMERGENCY: No alternative cities found');
      return { 
        pairs: [], 
        baseOrigin: { city: originCity.city, state: originCity.state_or_province, zip: originCity.zip || '' }, 
        baseDest: { city: destCity.city, state: destCity.state_or_province, zip: destCity.zip || '' } 
      };
    }
    
    // Create 5 pairs using actual nearby cities from YOUR database
    const pairs = [];
    for (let i = 0; i < 5; i++) {
      const originAlt = nearOrigins[i % nearOrigins.length];
      const destAlt = nearDests[i % nearDests.length];
      
      pairs.push({
        pickup: { 
          city: originAlt.city, 
          state: originAlt.state_or_province, 
          zip: originAlt.zip || '' 
        },
        delivery: { 
          city: destAlt.city, 
          state: destAlt.state_or_province, 
          zip: destAlt.zip || '' 
        }
      });
    }
    
    console.log(`EMERGENCY: Generated ${pairs.length} pairs using YOUR database:`, 
      pairs.map(p => `${p.pickup.city},${p.pickup.state} -> ${p.delivery.city},${p.delivery.state}`)
    );
    
    return {
      pairs,
      baseOrigin: { city: originCity.city, state: originCity.state_or_province, zip: originCity.zip || '' },
      baseDest: { city: destCity.city, state: destCity.state_or_province, zip: destCity.zip || '' }
    };
    
  } catch (error) {
    console.error('Emergency pairs database error:', error);
    return { 
      pairs: [], 
      baseOrigin: { city: origin.city, state: origin.state, zip: '' }, 
      baseDest: { city: dest.city, state: dest.state, zip: '' } 
    };
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
  const usedRefIds = new Set(); // Track reference IDs across entire CSV export
  const usedCities = new Set(); // Track cities across entire CSV export for diversity
  console.log(`BULK EXPORT: Processing ${lanes.length} lanes with preferFillTo10=${preferFillTo10}`);
  console.log(`🔍 PARAMETER CHECK: preferFillTo10 type: ${typeof preferFillTo10}, value: ${preferFillTo10}, strict boolean: ${preferFillTo10 === true}`);
  
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    try {
      console.log(`BULK EXPORT: Processing lane ${i+1}/${lanes.length}: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
      
      // Use intelligent crawler with guaranteed row counts and city diversity
      const crawl = await planPairsForLane(lane, { preferFillTo10, usedCities });
      const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, preferFillTo10, usedRefIds);
      
      // GUARANTEE CHECK: When preferFillTo10=true, every lane MUST generate exactly 12 rows
      if (preferFillTo10 && rows.length !== 12) {
        console.error(`Critical error: Lane ${i+1} generated ${rows.length} rows instead of required 12`);
        throw new Error(`Row count guarantee failed for lane ${i+1}: got ${rows.length}, expected 12`);
      }
      
      console.log(`BULK EXPORT: Lane ${i+1} generated ${rows.length} rows (expected: ${preferFillTo10 ? 12 : 6})`);
      console.log(`🌍 DIVERSITY TRACKER: ${usedCities.size} unique cities used so far`);
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
  const { method } = req;
  
  console.log(`🕐 API CALL TIMESTAMP: ${new Date().toISOString()} - Method: ${method}`);
  console.log(`🔍 QUERY PARAMS:`, req.query);
  
  if (!['GET', 'HEAD'].includes(method)) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // DEFAULT TO FILL MODE for production unless explicitly set to 0
  const preferFillTo10 = String(req.query.fill || '1') !== '0';
  const pending = String(req.query.pending || '') === '1';
  const all = String(req.query.all || '') === '1';
  const days = req.query.days != null ? Number(req.query.days) : null;
  const partParam = req.query.part != null ? Number(req.query.part) : null;

  console.log(`🚨 CRITICAL DEBUG: req.query.fill = "${req.query.fill}" (type: ${typeof req.query.fill})`);
  console.log(`🚨 CRITICAL DEBUG: preferFillTo10 = ${preferFillTo10} (type: ${typeof preferFillTo10})`);
  console.log(`🚨 CRITICAL DEBUG: DEFAULTING TO FILL MODE - only disabled with explicit fill=0`);
  console.log(`🚨 CRITICAL DEBUG: Expected rows per lane when preferFillTo10=true: 12 (6 postings × 2 contacts)`);
  console.log(`🚨 CRITICAL DEBUG: Expected rows per lane when preferFillTo10=false: 8 (4 postings × 2 contacts)`);
  console.log(`🔥 DEPLOYMENT TIMESTAMP: ${new Date().toISOString()} - NEW DEBUG CODE ACTIVE`);
  console.log(`🔥 ROW COUNT FIX: This should generate 144 rows for 12 lanes, not 120!`);

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

    // Update lane statuses to 'posted' after successful CSV generation
    try {
      const laneIds = lanes.map(lane => lane.id);
      if (laneIds.length > 0) {
        await adminSupabase
          .from('lanes')
          .update({ status: 'posted', posted_at: new Date().toISOString() })
          .in('id', laneIds);
        console.log(`✅ Updated ${laneIds.length} lanes to 'posted' status`);
      }
    } catch (updateError) {
      console.error('Failed to update lane statuses:', updateError);
      // Don't fail the export if status update fails
    }

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
// CACHE BUST Wed Aug 27 00:08:28 UTC 2025
