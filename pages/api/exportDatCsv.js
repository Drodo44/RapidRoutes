// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exact 24 headers
// - 22 rows per lane (base + 10 pairs, duplicated for contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { planPairsForLane } from '../../lib/planPairsForLane.js';
import { rowsFromBaseAndPairs, toCsv, chunkRows } from '../../lib/datCsvBuilder';
import { FreightIntelligence } from '../../lib/FreightIntelligence.js';

// Use our proven intelligent routing system for lane pair generation
async function generatePairsForLane(lane) {
  try {
    console.log(`🔍 Generating intelligent pairs for: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
    
    const intelligence = new FreightIntelligence();
    const result = await intelligence.generateDiversePairs({
      origin: {
        city: lane.origin_city,
        state: lane.origin_state,
        zip: lane.origin_zip
      },
      destination: {
        city: lane.dest_city,
        state: lane.dest_state,
        zip: lane.dest_zip
      },
      equipment: lane.equipment_code,
      preferFillTo10: true  // Always optimize for maximum pairs while ensuring minimum 6
    });

    if (!result?.pairs?.length) {
      console.error(`❌ Failed to generate pairs for lane ${lane.id}`);
      return {
        pairs: [],
        baseOrigin: { city: lane.origin_city, state: lane.origin_state },
        baseDest: { city: lane.dest_city, state: lane.dest_state }
      };
    }

    // Verify pair diversity using KMA codes
    const diversityCheck = new Set();
    const pairScores = [];

    for (const pair of result.pairs) {
      diversityCheck.add(`${pair.origin.kma_code}-${pair.destination.kma_code}`);
      pairScores.push(intelligence.calculateFreightScore(pair));
    }

    if (diversityCheck.size < 6) {
      console.error(`❌ Insufficient KMA diversity: ${diversityCheck.size} unique pairs for lane ${lane.id}`);
      return {
        pairs: [],
        baseOrigin: { city: lane.origin_city, state: lane.origin_state },
        baseDest: { city: lane.dest_city, state: lane.dest_state }
      };
    }

    const avgScore = pairScores.reduce((a, b) => a + b, 0) / pairScores.length;
    console.log(`✅ Generated ${result.pairs.length} pairs (${diversityCheck.size} unique KMAs, score: ${avgScore.toFixed(2)})`);

    const formattedPairs = result.pairs.map(p => ({
      pickup: {
        city: p.origin.city,
        state: p.origin.state,
        zip: p.origin.zip || ''
      },
      delivery: {
        city: p.destination.city,
        state: p.destination.state,
        zip: p.destination.zip || ''
      }
    }));

    return {
      pairs: formattedPairs,
      baseOrigin: { 
        city: lane.origin_city, 
        state: lane.origin_state,
        zip: lane.origin_zip || '' 
      },
      baseDest: { 
        city: lane.dest_city, 
        state: lane.dest_state,
        zip: lane.dest_zip || '' 
      }
    };

  } catch (error) {
    console.error('Failed to generate intelligent pairs:', error);
    return {
      pairs: [],
      baseOrigin: { city: lane.origin_city, state: lane.origin_state },
      baseDest: { city: lane.dest_city, state: lane.dest_state }
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
  console.log(`BULK EXPORT: Processing ${lanes.length} lanes with preferFillTo10=${preferFillTo10}`);
  console.log(`🔍 PARAMETER CHECK: preferFillTo10 type: ${typeof preferFillTo10}, value: ${preferFillTo10}, strict boolean: ${preferFillTo10 === true}`);
  
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    try {
      console.log(`Processing lane ${i+1}/${lanes.length}: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
      
      // CRITICAL FIX: Each lane gets its OWN fresh usedCities set for unique pairs per lane
      const usedCities = new Set(); // Fresh set for THIS lane only - allows city reuse across different lanes
      
      // Use the original intelligent crawler that was working
      console.log(`🧠 Lane ${i+1}: Using intelligent crawler with HERE.com verification`);
      const crawl = await planPairsForLane(lane, { preferFillTo10, usedCities });
      
      if (crawl.insufficient) {
        console.warn(`⚠️ LANE ${lane.id} INSUFFICIENT: ${crawl.message}. Using the ${crawl.pairs?.length || 0} pairs found.`);
      }
      
      console.log(`🎯 Lane ${i+1}: Intelligent crawler found ${crawl.pairs?.length || 0} pairs`);
      
      const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, preferFillTo10, usedRefIds);
      
      console.log(`Lane ${i+1} generated ${rows.length} rows`);
      allRows.push(...rows);
    } catch (laneError) {
      console.error(`BULK EXPORT: Error processing lane ${i+1} (${lane.id}):`, laneError);
      // Skip this lane but continue with others
      continue;
    }
  }
  
  console.log(`Total rows generated: ${allRows.length}`);
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

  // Always optimize for maximum pairs (up to 11) while ensuring minimum 6
  const preferFillTo10 = true; // Force optimization mode on
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
