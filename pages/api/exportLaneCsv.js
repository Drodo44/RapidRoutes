// pages/api/exportLaneCsv.js
// GET /api/exportLaneCsv?id=<laneId>&fill=0|1
// Returns a single-lane CSV (24 headers, minimum 12 rows per lane, scales with market density).
// Streams as text/csv with Content-Disposition for browser download.

import { adminSupabase } from '../../utils/supabaseClient';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { rowsFromBaseAndPairs, toCsv } from '../../lib/datCsvBuilder';
import { FreightIntelligence } from '../../lib/FreightIntelligence.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = String(req.query.id || '').trim();
  const preferFillTo10 = String(req.query.fill || '0') === '1';
  if (!id) return res.status(400).json({ error: 'lane id required' });

  try {
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

    // Enhanced debug info
    console.log(`🧠 INTELLIGENT EXPORT DEBUG:`);
    console.log(`  preferFillTo10: ${preferFillTo10}`);
    console.log(`  Generated pairs: ${result.pairs.length}`);
    console.log(`  Total rows: ${rows.length} (minimum: 12, scales with market density)`);
    console.log(`  Pairs details:`, result.pairs.map(p => 
      `${p.pickup.city}, ${p.pickup.state} (KMA: ${p.geographic.pickup_kma}) -> ${p.delivery.city}, ${p.delivery.state} (KMA: ${p.geographic.delivery_kma})`
    ));
    
    const csv = toCsv(DAT_HEADERS, rows);
    const filename = `DAT_Upload_${id}.csv`;

    // Add debug headers
    res.setHeader('X-Debug-Pairs', String(crawl.pairs.length));
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
