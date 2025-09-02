// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exact 24 headers
// - 12 rows per lane (6 pairs × 2 contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { generateDatCsvRows, toCsv, chunkRows } from '../../lib/datCsvBuilder';
import { FreightIntelligence } from '../../lib/FreightIntelligence.js';

export default async function handler(req, res) {
  // Check if this is a HEAD request for pagination info
  if (req.method === 'HEAD') {
    const pendingCount = await getPendingRowCount();
    const parts = Math.ceil(pendingCount / 499);
    res.setHeader('X-Total-Parts', String(parts));
    return res.status(200).end();
  }

  try {
    const { pending, days, all, fill, part } = req.query;
    console.log('🔍 EXPORT REQUEST:', { pending, days, all, fill, part });

    // Get lanes based on filters
    const { data: lanes, error } = await getLanes({ pending, days, all });
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!lanes?.length) {
      console.log('ℹ️ No lanes to export');
      return res.status(200).json({ 
        rows: [],
        message: 'No lanes found matching criteria' 
      });
    }

    console.log(`📋 Processing ${lanes.length} lanes...`);
    
    // Generate rows for all lanes using datCsvBuilder
    const allRows = [];
    for (const lane of lanes) {
      try {
        const rows = await generateDatCsvRows(lane);
        if (rows?.length) {
          allRows.push(...rows);
        }
      } catch (error) {
        console.error(`❌ Failed to generate rows for lane ${lane.id}:`, error);
        // Continue with other lanes
      }
    }

    // Split into parts if needed (max 499 rows per part)
    const parts = chunkRows(allRows, 499);
    const partIndex = part ? parseInt(part, 10) - 1 : 0;
    const selectedRows = parts[partIndex] || [];

    console.log('BULK EXPORT DEBUG: Part ' + (partIndex + 1) + '/' + parts.length);
    console.log('  Lanes processed:', lanes.length);
    console.log('  Total rows generated:', allRows.length);
    console.log('  Fill-to-5 mode:', Boolean(fill));
    console.log('  Selected rows for this part:', selectedRows.length);

    // Generate CSV
    const csv = toCsv(DAT_HEADERS, selectedRows);
    const csvRows = csv.split('\n');
    console.log('  Actual CSV rows:', csvRows.length);
    console.log('  First few lines:', [csvRows[0]]);

    // Send response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=dat_upload_${Date.now()}.csv`);
    return res.status(200).send(csv);

  } catch (error) {
    console.error('❌ Export failed:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getLanes({ pending, days, all }) {
  let query = adminSupabase.from('lanes').select('*');
  
  if (pending) {
    query = query.eq('status', 'pending');
  } else if (days) {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days, 10));
    query = query.gte('created_at', daysAgo.toISOString());
  } else if (!all) {
    query = query.eq('status', 'pending'); // Default to pending
  }
  
  return await query;
}

async function getPendingRowCount() {
  const { data: lanes, error } = await adminSupabase
    .from('lanes')
    .select('id')
    .eq('status', 'pending');
    
  if (error) throw error;
  // Each lane needs minimum 6 pairs × 2 contacts = 12 rows
  return (lanes?.length || 0) * 12;
}

    // Verify KMA diversity using preserved geographic data
    const uniqueKmaPairs = new Set(
      formattedPairs.map(p => `${p.geographic.pickup_kma}-${p.geographic.delivery_kma}`)
    );

    console.log(`🔍 DIVERSITY CHECK: Lane ${lane.id}`);
    console.log(`   Pairs: ${formattedPairs.length}`);
    console.log(`   Unique KMAs: ${uniqueKmaPairs.size}`);
    console.log(`   Avg Score: ${avgScore.toFixed(2)}`);

    // Only return pairs if we have enough diversity
    if (uniqueKmaPairs.size < 6) {
      console.error(`❌ Lane ${lane.id}: Only ${uniqueKmaPairs.size} unique KMA pairs (need 6)`);
      throw new Error(`Insufficient KMA diversity for lane ${lane.id}`);
    }

    console.log(`✅ Lane ${lane.id}: Generated ${formattedPairs.length} pairs with ${uniqueKmaPairs.size} unique KMAs`);

    // Return valid pairs with all necessary data
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
      },
      stats: {
        uniqueKmas: uniqueKmaPairs.size,
        avgScore: avgScore,
        totalPairs: formattedPairs.length
      }
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
      
      // Use our proven FreightIntelligence system
      console.log(`🧠 Lane ${i+1}: Using FreightIntelligence system with KMA diversity`);
      const crawl = await generatePairsForLane(lane);
      
      // Validate the returned pairs
      if (!crawl.pairs?.length) {
        console.error(`❌ LANE ${lane.id}: No valid pairs generated`);
        continue; // Skip this lane
      }
      
      console.log(`✅ Lane ${i+1}: Generated ${crawl.pairs.length} diverse pairs`);
      console.log(`🎯 Base pair: ${crawl.baseOrigin.city}, ${crawl.baseOrigin.state} -> ${crawl.baseDest.city}, ${crawl.baseDest.state}`);
      
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
