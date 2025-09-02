// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exactly 24 headers
// - Minimum 12 rows per lane (6 pairs × 2 contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { generateDatCsvRows, toCsv, chunkRows } from '../../lib/datCsvBuilder';

// Helper to get pending row count for pagination
async function getPendingRowCount() {
  const { data: lanes, error } = await adminSupabase
    .from('lanes')
    .select('id')
    .eq('status', 'pending');
    
  if (error) throw error;
  return (lanes?.length || 0) * 12; // 6 pairs × 2 contact methods = 12 rows minimum per lane
}

function daysAgoUTC(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

// Helper to select lanes based on query parameters
async function selectLanes({ pending, days, all }) {
  let q = adminSupabase.from('lanes')
    .select('*')
    .order('created_at', { ascending: false });

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

  const { data, error } = await q.limit(2000); // sane cap for bulk exports
  if (error) throw error;
  return data || [];
}

// Main handler for DAT CSV export
export default async function handler(req, res) {
  const { method } = req;
  
  console.log(`🔍 ${method} /api/exportDatCsv`);
  console.log('Query params:', req.query);

  try {
    // Handle HEAD request for pagination info
    if (method === 'HEAD') {
      const pendingCount = await getPendingRowCount();
      const parts = Math.ceil(pendingCount / 499);
      res.setHeader('X-Total-Parts', String(parts));
      return res.status(200).end();
    }

    if (method !== 'GET') {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get query parameters with defaults
    const pending = String(req.query.pending || '') === '1';
    const all = String(req.query.all || '') === '1';
    const days = req.query.days != null ? Number(req.query.days) : null;
    const part = req.query.part != null ? Number(req.query.part) : 1;

    console.log('📋 Processing request:', { pending, days, all, part });

    // Get lanes to process
    const lanes = await selectLanes({ pending, days, all });
    
    if (!lanes?.length) {
      console.log('ℹ️ No lanes to export');
      return res.status(200).json({ rows: [], message: 'No matching lanes' });
    }

    console.log(`🔄 Processing ${lanes.length} lanes...`);
    
    // Generate all rows
    const allRows = [];
    const errors = [];
    
    for (const lane of lanes) {
      try {
        const rows = await generateDatCsvRows(lane);
        if (rows?.length) {
          allRows.push(...rows);
          console.log(`✅ Lane ${lane.id}: Generated ${rows.length} rows`);
        }
      } catch (error) {
        console.error(`❌ Lane ${lane.id} failed:`, error);
        errors.push({ laneId: lane.id, error: error.message });
      }
    }

    // Split into parts (max 499 rows per file)
    const parts = chunkRows(allRows, 499);
    const partIndex = Math.max(0, part - 1);
    const selectedRows = parts[partIndex] || [];

    // Log detailed status
    console.log('📊 EXPORT STATUS:');
    console.log(`   Lanes: ${lanes.length} processed, ${errors.length} failed`);
    console.log(`   Rows: ${allRows.length} total, ${selectedRows.length} in part ${partIndex + 1}/${parts.length}`);
    
    if (!selectedRows.length) {
      return res.status(200).json({ 
        message: 'No rows in selected part',
        totalParts: parts.length,
        totalRows: allRows.length,
        errors 
      });
    }

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

    // Generate and send CSV with descriptive filename
    const csv = toCsv(DAT_HEADERS, selectedRows);
    const baseName = pending ? 'DAT_Pending' : all ? 'DAT_All' : days != null ? `DAT_Last${days}d` : 'DAT_Pending';
    const filename = parts.length > 1
      ? `${baseName}_part${partIndex + 1}-of-${parts.length}.csv`
      : `${baseName}.csv`;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Total-Parts', String(parts.length));
    res.setHeader('X-Debug-Lanes-Processed', String(lanes.length));
    res.setHeader('X-Debug-Total-Rows', String(allRows.length));
    res.setHeader('X-Debug-Selected-Rows', String(selectedRows.length));

    return res.status(200).send(csv);

  } catch (error) {
    console.error('❌ Export failed:', error);
    if (method === 'HEAD') {
      return res.status(500).end();
    }
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}
