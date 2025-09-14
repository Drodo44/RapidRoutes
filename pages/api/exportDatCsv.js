// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exactly 24 headers
// - Minimum 12 rows per lane (6 pairs × 2 contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient.js';
import { generateDatCsvRows, toCsv, chunkRows, MIN_PAIRS_REQUIRED, ROWS_PER_PAIR, DAT_HEADERS } from '../../lib/datCsvBuilder.js';
import { monitor } from '../../lib/monitor.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';

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
    
    if (!lanes?.length) {
      monitor.log('info', 'No lanes to export');
      monitor.endOperation(operationId, { success: true, lanes: 0 });
      return res.status(200).json({ rows: [], message: 'No matching lanes' });
    }

    monitor.log('info', `Processing ${lanes.length} lanes...`);
    
    // Generate all rows with comprehensive validation logging
  const allRows = [];
  const errors = [];
    const validationLog = {
      total: lanes.length,
      successful: 0,
      failed: 0,
      details: []
    };
    
    console.log('🔍 CSV VALIDATION: Processing', lanes.length, 'lanes...');
    
    for (const [index, lane] of lanes.entries()) {
      const laneLog = {
        laneId: lane.id,
        index: index + 1,
        status: 'unknown',
        rowsGenerated: 0,
        error: null
      };
      
      try {
        console.log(`🔄 Lane ${index + 1}/${lanes.length}: Processing ${lane.id}...`);
        const rows = await generateDatCsvRows(lane);
        
        if (rows?.length) {
          // Validate row structure for DAT compliance
          if (!Array.isArray(rows)) {
            throw new Error(`Invalid rows structure: Expected array, got ${typeof rows}`);
          }
          
          // Validate first row has all required headers
          const firstRow = rows[0];
          if (!firstRow || typeof firstRow !== 'object') {
            throw new Error(`Invalid row object: Expected object, got ${typeof firstRow}`);
          }
          
          const missingHeaders = DAT_HEADERS.filter(header => !(header in firstRow));
          if (missingHeaders.length > 0) {
            throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
          }
          
          allRows.push(...rows);
          laneLog.status = 'success';
          laneLog.rowsGenerated = rows.length;
          validationLog.successful++;
          
          console.log(`✅ Lane ${lane.id}: Generated ${rows.length} valid DAT rows`);
          monitor.log('info', `Lane ${lane.id}: Generated ${rows.length} rows`);
        } else {
          throw new Error('No rows generated by intelligence system');
        }
      } catch (error) {
        laneLog.status = 'failed';
        laneLog.error = error.message;
        laneLog.details = {
          equipment: lane.equipment_code,
          origin: `${lane.origin_city}, ${lane.origin_state}`,
          destination: `${lane.dest_city}, ${lane.dest_state}`,
          weight: lane.randomize_weight ? `${lane.weight_min}-${lane.weight_max}` : lane.weight_lbs,
          error_details: error.details || null
        };
        validationLog.failed++;
        
        console.log(`❌ Lane ${lane.id}: Failed -`, error.message);
        await monitor.logError(error, `Lane ${lane.id} failed`, laneLog.details);
        errors.push({ laneId: lane.id, error: error.message, details: laneLog.details });
      }
      
      validationLog.details.push(laneLog);
    }
    
    // Log comprehensive validation results
    console.log('📊 CSV VALIDATION SUMMARY:');
    console.log('  Total lanes:', validationLog.total);  
    console.log('  Successful:', validationLog.successful);
    console.log('  Failed:', validationLog.failed);
    console.log('  Success rate:', `${((validationLog.successful / validationLog.total) * 100).toFixed(1)}%`);
    console.log('  Total rows generated:', allRows.length);

    // Split into parts (max 499 rows per file)
    const parts = chunkRows(allRows, 499);
    const partIndex = Math.max(0, part - 1);
    const selectedRows = parts[partIndex] || [];

    // Log detailed status
    monitor.log('info', 'EXPORT STATUS:', {
      lanes: {
        processed: lanes.length,
        failed: errors.length
      },
      rows: {
        total: allRows.length,
        selected: selectedRows.length,
        part: `${partIndex + 1}/${parts.length}`
      }
    });
    
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

    // Generate and send CSV with descriptive filename
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
