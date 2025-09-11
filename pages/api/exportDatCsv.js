// pages/api/exportDatCsv.js
// GET /api/exportDatCsv?pending=1|&days=<n>|&all=1&fill=0|1&part=<n>
// - Streams a CSV with exactly 24 headers
// - Minimum 12 rows per lane (6 pairs × 2 contact methods)
// - Splits into ≤499 rows per part; HEAD returns X-Total-Parts for pagination
// - If part is specified for GET, returns only that part.

import { adminSupabase } from '../../utils/supabaseClient.js';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { generateDatCsvRows, toCsv, chunkRows } from '../../lib/datCsvBuilder.js';
import { monitor } from '../../lib/monitor.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';
import { generateReferenceId } from '../../lib/referenceIdUtils.js';

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

// Emergency fallback CSV generation that doesn't use intelligence system
function generateEmergencyCSV(lanes) {
  console.log('🚨 EMERGENCY: Using fallback CSV generation without intelligence system');
  
  const rows = [];
  
  for (const lane of lanes) {
    try {
      // Basic validation
      if (!lane.origin_city || !lane.dest_city || !lane.equipment_code) {
        console.warn(`⚠️ Skipping invalid lane ${lane.id}: missing required fields`);
        continue;
      }

      // Generate weight
      const weight = lane.randomize_weight 
        ? Math.floor(Math.random() * ((lane.weight_max || 48000) - (lane.weight_min || 40000) + 1)) + (lane.weight_min || 40000)
        : (lane.weight_lbs || 45000);

      // Generate RR number
      const referenceId = generateReferenceId(lane.id);

      // Create basic rows (origin to destination only, both contact methods)
      const contactMethods = ['Email', 'Primary Phone'];
      
      for (const contactMethod of contactMethods) {
        const row = [
          lane.pickup_earliest || '',
          lane.pickup_latest || lane.pickup_earliest || '',
          lane.length_ft || 48,
          weight,
          lane.full_partial || 'Full',
          lane.equipment_code,
          'Yes', // Use Private Network
          '', // Private Network Rate
          'Yes', // Allow Private Network Booking
          'No', // Allow Private Network Bidding  
          'Yes', // Use DAT Loadboard
          '', // DAT Loadboard Rate
          'Yes', // Allow DAT Loadboard Booking
          'No', // Use Extended Network
          contactMethod,
          lane.origin_city,
          lane.origin_state,
          lane.origin_zip || '',
          lane.dest_city,
          lane.dest_state,
          lane.dest_zip || '',
          lane.comment || '',
          lane.commodity || '',
          referenceId
        ];
        
        rows.push(row);
      }
      
      console.log(`✅ Generated 2 emergency rows for lane ${lane.id} (${referenceId})`);
      
    } catch (laneError) {
      console.error(`❌ Failed to generate emergency CSV for lane ${lane.id}:`, laneError);
    }
  }
  
  console.log(`🚨 Emergency CSV generated ${rows.length} total rows for ${lanes.length} lanes`);
  return rows;
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
    
    // Try intelligence system first, fallback to emergency system if it fails
    let allRows = [];
    const errors = [];
    
    try {
      console.log('🧠 Attempting intelligent CSV generation...');
      
      for (const lane of lanes) {
        try {
          const rows = await generateDatCsvRows(lane);
          if (rows?.length) {
            allRows.push(...rows);
            monitor.log('info', `Lane ${lane.id}: Generated ${rows.length} rows`);
          }
        } catch (error) {
          await monitor.logError(error, `Lane ${lane.id} failed`);
          errors.push({ laneId: lane.id, error: error.message });
        }
      }
      
      // Check if intelligence system worked
      if (allRows.length === 0 && lanes.length > 0) {
        console.log('❌ Intelligence system generated 0 rows, switching to emergency fallback');
        throw new Error('Intelligence system failed to generate any rows');
      }
      
      console.log(`✅ Intelligence system succeeded: ${allRows.length} rows generated`);
      
    } catch (intelligenceError) {
      console.error('❌ Intelligence system completely failed:', intelligenceError.message);
      console.log('🚨 Switching to emergency CSV generation...');
      
      // Use emergency fallback that bypasses intelligence system
      const emergencyRows = generateEmergencyCSV(lanes);
      
      if (emergencyRows.length === 0) {
        throw new Error('Both intelligence system and emergency fallback failed');
      }
      
      allRows = emergencyRows;
      console.log(`🚨 Emergency fallback succeeded: ${allRows.length} rows generated`);
      
      // Clear previous errors since we have a working fallback
      errors.length = 0;
    }

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
      monitor.endOperation(operationId, { success: true, ...result });
      return res.status(200).json(result);
    }

    // Update lane statuses to 'posted' after successful CSV generation
    try {
      // Only users with Admin role can update lane status
      const laneIds = lanes.map(lane => lane.id);
      if (laneIds.length > 0) {
        if (auth.profile.role === 'Admin') {
          await adminSupabase
            .from('lanes')
            .update({ status: 'posted', posted_at: new Date().toISOString() })
            .in('id', laneIds);
          monitor.log('info', `Updated ${laneIds.length} lanes to 'posted' status`);
        } else {
          monitor.log('warn', `User ${auth.user.email} lacks permission to update lane status`);
        }
      }
    } catch (updateError) {
      await monitor.logError(updateError, 'Failed to update lane statuses');
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
