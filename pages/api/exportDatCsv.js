// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exactly 24 headers
// - Minimum 12 rows per lane (6 pairs × 2 contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient.js';
import { EnterpriseCsvGenerator } from '../../lib/enterpriseCsvGenerator.js';
import { toCsv, chunkRows, DAT_HEADERS, MIN_PAIRS_REQUIRED, ROWS_PER_PAIR } from '../../lib/datCsvBuilder.js';
import { monitor } from '../../lib/monitor.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';
import fs from 'fs';
import path from 'path';

// Helper to get pending row count for pagination
async function getPendingRowCount() {
  const { data: lanes, error } = await adminSupabase
    .from('lanes')
    .select('id')
    .eq('status', 'pending');
    
  if (error) throw error;
  return (lanes?.length || 0) * (MIN_PAIRS_REQUIRED * ROWS_PER_PAIR); // Each lane needs minimum pairs × contact methods
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
  
  const operationId = `export_${Date.now()}`;
  monitor.startOperation(operationId, {
    method,
    query: req.query
  });

  // Validate user has necessary permissions
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  // Check role permissions: Admin, Broker, and Support can export CSVs (Apprentice cannot)
  const allowedRoles = ['Admin', 'Administrator', 'Broker', 'Support'];
  if (!allowedRoles.includes(auth.profile.role)) {
    monitor.log('warn', `CSV export denied for role: ${auth.profile.role} (${auth.user.email})`);
    return res.status(403).json({ 
      error: 'Insufficient permissions. Admin, Broker, or Support role required for CSV export.' 
    });
  }

  // Log authenticated user
  monitor.log('info', `Authorized user: ${auth.user.email} (${auth.profile.role})`);

  try {
    monitor.log('info', `${method} /api/exportDatCsv`);
    monitor.log('debug', 'Query params:', req.query);

    // Handle HEAD request for pagination info
    if (method === 'HEAD') {
      const pendingCount = await getPendingRowCount();
      const parts = Math.ceil(pendingCount / 499);
      res.setHeader('X-Total-Parts', String(parts));
      monitor.endOperation(operationId, { success: true, parts });
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

    monitor.log('info', 'Processing request:', { pending, days, all, part });


    // Get lanes to process
    const lanes = await selectLanes({ pending, days, all });
    console.log(`📦 Found ${lanes?.length || 0} lanes to export`);

    if (!lanes || lanes.length === 0) {
      monitor.log('warn', 'CSV export failed: No valid freight data found');
      monitor.endOperation(operationId, { success: false, lanes: 0 });
      return res.status(422).json({ error: 'CSV export failed: No valid freight data generated' });
    }

    monitor.log('info', `Processing ${lanes.length} lanes with EnterpriseCsvGenerator...`);

    // Debug logging for each lane before processing
    console.log('🔍 PRE-PROCESSING LANE DEBUG:');
    lanes.forEach((lane, i) => {
      console.log(`📋 Lane [${i}] ID: ${lane.id}, Origin: ${lane.origin_city}, ${lane.origin_state}, Dest: ${lane.dest_city}, ${lane.dest_state}, Equipment: ${lane.equipment_code}`);
    });

    // Use enterprise generator for full Phase 9 logic
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 6, // Production minimum
        enableTransactions: true,
        enableCaching: true
      },
      verification: { postGenerationVerification: true }
    });

    const result = await generator.generate(lanes);
    const allRows = result.csv?.rows || [];
    const laneResults = result.laneResults || [];

    if (!allRows || allRows.length === 0) {
      console.log(`❌ CSV export failed: CSV builder returned 0 rows from ${lanes.length} lanes`);
      monitor.log('warn', 'CSV export failed: CSV builder returned 0 rows');
      monitor.endOperation(operationId, { success: false, lanes: lanes.length, rows: 0 });
      return res.status(422).json({ error: 'CSV export failed: CSV builder returned 0 rows' });
    }
    const errors = [];
    let successful = 0;
    let failed = 0;
    for (const laneResult of laneResults) {
      if (laneResult.success) {
        successful++;
      } else {
        failed++;
        errors.push({
          laneId: laneResult.lane_id,
          error: laneResult.error,
          details: laneResult.details || {}
        });
        // Log failed lane for review
        monitor.log('warn', `Lane ${laneResult.lane_id} failed diversity check:`, laneResult.error);
      }
    }

    // Log summary
    console.log('📊 PHASE 9 EXPORT SUMMARY:');
    console.log('  Total lanes:', lanes.length);
    console.log('  Successful:', successful);
    console.log('  Failed:', failed);
    console.log('  Success rate:', `${((successful / lanes.length) * 100).toFixed(1)}%`);
    console.log('  Total rows generated:', allRows.length);

  // Prepare chunking and selection
    const parts = chunkRows(allRows, 499);
    const partIndex = Math.max(0, part - 1);
    const selectedRows = parts[partIndex] || [];
    // (Already declared in new logic above)

    // Output lane-by-lane CSV generation results
    console.log('🔍 LANE-BY-LANE CSV GENERATION RESULTS:');
    laneResults.forEach((laneResult, i) => {
      const originalLane = lanes.find(l => l.id === laneResult.lane_id) || lanes[i];
      if (laneResult.success) {
        console.log(`✅ Lane [${i}] (ID: ${laneResult.lane_id}) generated ${laneResult.rows_generated || 0} CSV rows`);
        console.log(`   └─ KMAs: ${laneResult.unique_kmas}, Pairs: ${laneResult.pairs_generated || 'N/A'}`);
      } else {
        console.log(`❌ Lane [${i}] (ID: ${laneResult.lane_id}) failed to generate CSV rows:`, originalLane ? `${originalLane.origin_city}-${originalLane.dest_city}` : 'Unknown');
        console.log(`   └─ Error: ${laneResult.error}`);
      }
    });

    // Continue to CSV building and file output below
    
    if (!selectedRows.length) {
      const result = { 
        message: 'No rows in selected part',
        totalParts: parts.length,
        totalRows: allRows.length,
        errors 
      };
      
      // 🚨 CRITICAL FIX: Return proper error response instead of JSON-as-CSV corruption
      console.error('❌ CSV EXPORT FAILED: No valid rows generated');
      console.error('  Total lanes processed:', lanes.length);
      console.error('  Total rows generated:', allRows.length);
      console.error('  Errors encountered:', errors.length);
      console.error('  Selected part:', part, 'of', parts.length);
      
      monitor.endOperation(operationId, { success: false, ...result });
      
      // Return JSON error response with appropriate status - do NOT send as CSV
      return res.status(422).json({
        error: 'CSV export failed: No valid freight data generated',
        details: {
          lanesProcessed: lanes.length,
          totalRowsGenerated: allRows.length,
          errorsEncountered: errors.length,
          selectedPart: part,
          totalParts: parts.length,
          reason: allRows.length === 0 ? 'All lanes failed intelligence requirements' : 'Selected part contains no data'
        },
        errors: errors.map(err => ({
          laneId: err.laneId,
          error: err.error,
          details: err.details
        })),
        phase: 'phase9-csv-diagnostics'
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
        monitor.log('info', `Updated ${laneIds.length} lanes to 'posted' status`);
      }
    } catch (updateError) {
      await monitor.logError(updateError, 'Failed to update lane statuses');
      // Don't fail the export if status update fails
    }

    // CRITICAL DEBUGGING: Log exactly what we're passing to toCsv
    console.log('🔍 CRITICAL DEBUG - exportDatCsv.js:');
    console.log('  selectedRows type:', typeof selectedRows);
    console.log('  selectedRows array:', Array.isArray(selectedRows) ? `Array(${selectedRows.length})` : typeof selectedRows);
    console.log('  DAT_HEADERS:', Array.isArray(DAT_HEADERS) ? `Array(${DAT_HEADERS.length})` : typeof DAT_HEADERS);
    
    if (Array.isArray(selectedRows) && selectedRows.length > 0) {
      console.log('  First row keys:', Object.keys(selectedRows[0]));
      console.log('  First row sample:', selectedRows[0]);
    } else {
      console.log('  ❌ PROBLEM: selectedRows is not a valid array or is empty!');
    }
    
    // CRITICAL VALIDATION: Prevent JSON corruption in CSV output
    if (!Array.isArray(selectedRows)) {
      console.error('❌ CRITICAL: Non-array data passed to CSV generation:', typeof selectedRows);
      return res.status(500).json({ 
        error: 'CSV generation failed: Invalid row data structure',
        debug: process.env.NODE_ENV === 'development' ? { dataType: typeof selectedRows } : undefined
      });
    }
    
    if (selectedRows.length === 0) {
      console.error('❌ CRITICAL: Empty rows array passed to CSV generation');
      return res.status(500).json({ 
        error: 'CSV generation failed: No data rows in selected part',
        debug: { totalParts: parts.length, totalRows: allRows.length, part }
      });
    }
    
    // Validate first row has proper CSV structure
    const firstRow = selectedRows[0];
    if (!firstRow || typeof firstRow !== 'object' || Array.isArray(firstRow)) {
      console.error('❌ CRITICAL: Invalid row structure detected:', typeof firstRow);
      return res.status(500).json({ 
        error: 'CSV generation failed: Invalid row object structure',
        debug: { firstRowType: typeof firstRow, isArray: Array.isArray(firstRow) }
      });
    }
    
    // Verify required CSV headers are present in row data
    const missingHeaders = DAT_HEADERS.filter(header => !(header in firstRow));
    if (missingHeaders.length > 0) {
      console.error('❌ CRITICAL: Missing required CSV headers in row data:', missingHeaders);
      return res.status(500).json({ 
        error: 'CSV generation failed: Missing required headers in row data',
        debug: { missingHeaders, availableKeys: Object.keys(firstRow) }
      });
    }

  // Generate CSV string from selected rows
  const csv = toCsv(DAT_HEADERS, selectedRows);
    
    // FINAL VALIDATION: Ensure CSV output is DAT-compliant
    if (!csv || typeof csv !== 'string') {
      console.error('❌ CRITICAL: toCsv returned non-string data:', typeof csv);
      return res.status(500).json({ 
        error: 'CSV generation failed: Invalid CSV output format'
      });
    }
    
    if (csv.startsWith('{') || csv.startsWith('[')) {
      console.error('❌ CRITICAL: CSV output appears to be JSON!', csv.substring(0, 100));
      return res.status(500).json({ 
        error: 'CSV generation failed: Output corrupted with JSON data'
      });
    }
    
    // Validate CSV has exactly 24 DAT headers
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      console.error('❌ CRITICAL: CSV is empty after generation');
      return res.status(500).json({ 
        error: 'CSV generation failed: Empty CSV output'
      });
    }
    
    const headerLine = lines[0];
    const headerCount = headerLine.split(',').length;
    if (headerCount !== 24) {
      console.error(`❌ CRITICAL: CSV has ${headerCount} headers, DAT requires exactly 24`);
      console.error('Headers found:', headerLine);
      return res.status(500).json({ 
        error: `CSV generation failed: Invalid header count (${headerCount}/24)`
      });
    }
    
    // Validate headers match DAT specification
    const actualHeaders = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const missingDatHeaders = DAT_HEADERS.filter(header => !actualHeaders.includes(header));
    if (missingDatHeaders.length > 0) {
      console.error('❌ CRITICAL: CSV missing required DAT headers:', missingDatHeaders);
      return res.status(500).json({ 
        error: 'CSV generation failed: Missing required DAT headers',
        missingHeaders: missingDatHeaders
      });
    }
    
    console.log('✅ CSV VALIDATION PASSED:');
    console.log('  Format: Valid CSV string');
    console.log('  Headers: 24/24 DAT-compliant');
    console.log('  Data rows:', lines.length - 1);
    console.log('  Total size:', csv.length, 'characters');
    // Write CSV to public directory and return JSON URL
    const fileName = 'dat_output.csv';
    const filePath = path.join(process.cwd(), 'public', fileName);
    fs.writeFileSync(filePath, csv);

    return res.status(200).json({
      success: true,
      url: `/${fileName}`,
      totalLanes: lanes.length,
      successful,
      failed,
      totalRows: allRows.length,
      selectedRows: selectedRows.length,
      parts: parts.length,
      part: partIndex + 1
    });

  } catch (error) {
    await monitor.logError(error, 'Export failed');
    monitor.endOperation(operationId, { success: false, error: error.message });
    
    if (method === 'HEAD') {
      return res.status(500).end();
    }
    
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
}
