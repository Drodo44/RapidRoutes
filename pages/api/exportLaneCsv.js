// pages/api/exportLaneCsv.js
// GET /api/exportLaneCsv?id=<laneId>&fill=0|1
// Returns a single-lane CSV (24 headers, minimum 12 rows per lane, scales with market density).
// Streams as text/csv with Content-Disposition for browser download.

import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { rowsFromBaseAndPairs, toCsv, MIN_PAIRS_REQUIRED, ROWS_PER_PAIR } from '../../lib/datCsvBuilder';
import { FreightIntelligence } from '../../lib/FreightIntelligence.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate user has necessary permissions
  const auth = await validateApiAuth(req, res);
  if (!auth) return;

  // Check role permissions: Admin, Broker, and Support can export CSVs (Apprentice cannot)
  const allowedRoles = ['Admin', 'Administrator', 'Broker', 'Support'];
  if (!allowedRoles.includes(auth.profile.role)) {
    return res.status(403).json({ 
      error: 'Insufficient permissions. Admin, Broker, or Support role required for CSV export.' 
    });
  }

  const id = String(req.query.id || '').trim();
  const preferFillTo10 = String(req.query.fill || '0') === '1';
  if (!id) return res.status(400).json({ error: 'lane id required' });

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { data: lane, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!lane) return res.status(404).json({ error: 'lane not found' });

    // Generate pairs using freight intelligence
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
      preferFillTo10
    });

    // Convert result to DAT format
    const usedRefIds = new Set();
    const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
    const baseDest = { city: lane.dest_city, state: lane.dest_state };
    const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, result.pairs, preferFillTo10, usedRefIds);

    // CRITICAL DEBUGGING: Log exactly what we're passing to toCsv
    console.log('🔍 CRITICAL DEBUG - exportLaneCsv.js:');
    console.log('  result type:', typeof result);
    console.log('  result.pairs:', Array.isArray(result?.pairs) ? `Array(${result.pairs.length})` : typeof result?.pairs);
    console.log('  rows type:', typeof rows);
    console.log('  rows array:', Array.isArray(rows) ? `Array(${rows.length})` : typeof rows);
    console.log('  DAT_HEADERS:', Array.isArray(DAT_HEADERS) ? `Array(${DAT_HEADERS.length})` : typeof DAT_HEADERS);
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('  First row keys:', Object.keys(rows[0]));
      console.log('  First row sample:', rows[0]);
    } else {
      console.log('  ❌ PROBLEM: rows is not a valid array or is empty!');
    }
    
    // Log basic export stats for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`🧠 Intelligent export: ${result.pairs.length} pairs → ${rows.length} rows`);
    }
    
    // CRITICAL VALIDATION: Prevent JSON corruption in CSV output
    if (!Array.isArray(rows)) {
      console.error('❌ CRITICAL: Non-array data passed to CSV generation:', typeof rows);
      return res.status(500).json({ 
        error: 'CSV generation failed: Invalid row data structure',
        debug: process.env.NODE_ENV === 'development' ? { dataType: typeof rows, dataValue: rows } : undefined
      });
    }
    
    if (rows.length === 0) {
      console.error('❌ CRITICAL: Empty rows array passed to CSV generation');
      return res.status(500).json({ 
        error: 'CSV generation failed: No data rows generated',
        debug: { pairsGenerated: result?.pairs?.length || 0, laneId: id }
      });
    }
    
    // Validate first row has proper CSV structure
    const firstRow = rows[0];
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
    
    const csv = toCsv(DAT_HEADERS, rows);
    
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
        error: `CSV generation failed: Invalid header count (${headerCount}/24)`,
        debug: { expectedHeaders: 24, actualHeaders: headerCount, laneId: id }
      });
    }
    
    console.log('✅ SINGLE LANE CSV VALIDATION PASSED:');
    console.log('  Lane ID:', id);
    console.log('  Intelligence pairs:', result.pairs.length);
    console.log('  CSV rows generated:', rows.length);
    console.log('  Headers: 24/24 DAT-compliant');
    console.log('  CSV size:', csv.length, 'characters');
    
    const filename = `DAT_Upload_${id}.csv`;

    // Add debug headers
    res.setHeader('X-Debug-Pairs', String(result.pairs.length));
    res.setHeader('X-Debug-Rows', String(rows.length));
    res.setHeader('X-Debug-FillTo10', String(preferFillTo10));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (err) {
    console.error('GET /api/exportLaneCsv error:', err);
    return res.status(500).json({ error: err.message || 'Failed to export lane CSV' });
  }
}
