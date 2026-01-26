// pages/api/debugCrawl.js
// GET /api/debugCrawl?origin=City,ST&dest=City,ST&equip=CODE&fill=0|1
// Returns crawl preview JSON with baseOrigin/baseDest/pairs, counts, reasons.

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

function parseCityState(s) {
  const [city, st] = String(s || '').split(',').map((x) => x.trim());
  if (!city || !st) return null;
  return { city, state: st.toUpperCase() };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const originS = req.query.origin;
  const destS = req.query.dest;
  const equip = String(req.query.equip || '').toUpperCase();
  const preferFillTo10 = String(req.query.fill || '0') === '1';

  const origin = parseCityState(originS);
  const destination = parseCityState(destS);
  if (!origin || !destination || !equip) {
    return res.status(400).json({ error: 'origin, dest, and equip are required. Use "City,ST".' });
  }

  try {
    const crawl = await generateGeographicCrawlPairs({
      origin,
      destination,
      equipment: equip,
      preferFillTo10,
    });

    return res.status(200).json({
      baseOrigin: crawl.baseOrigin,
      baseDest: crawl.baseDest,
      pairs: crawl.pairs,
      count: crawl.count,
      shortfallReason: crawl.shortfallReason,
      allowedDuplicates: crawl.allowedDuplicates,
    });
  } catch (err) {
    console.error('GET /api/debugCrawl error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate crawl' });
  }
}
