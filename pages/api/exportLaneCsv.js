// pages/api/exportLaneCsv.js
// GET /api/exportLaneCsv?id=<laneId>&fill=0|1
// Returns a single-lane CSV (24 headers, 22 rows per lane).
// Streams as text/csv with Content-Disposition for browser download.

import { adminSupabase } from '../../utils/supabaseClient';
import { DAT_HEADERS } from '../../lib/datHeaders.js';
import { planPairsForLane, rowsFromBaseAndPairs, toCsv } from '../../lib/datCsvBuilder';

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

    // Build crawl plan
    const crawl = await planPairsForLane(lane, { preferFillTo10 });
    const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, preferFillTo10);

    // Enhanced debug info
    console.log(`FILL-TO-5 EXPORT DEBUG:`);
    console.log(`  preferFillTo10: ${preferFillTo10}`);
    console.log(`  Generated pairs: ${crawl.pairs?.length || 0}`);
    console.log(`  Total rows: ${rows.length} (expected: ${preferFillTo10 ? 12 : 8})`);
    console.log(`  Shortfall reason: ${crawl.shortfallReason || 'none'}`);
    console.log(`  Pairs details:`, crawl.pairs?.map(p => `${p.pickup?.city}, ${p.pickup?.state} -> ${p.delivery?.city}, ${p.delivery?.state}`));
    
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
