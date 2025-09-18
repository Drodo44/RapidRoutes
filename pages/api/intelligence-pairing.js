// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { originCity, originState, destCity, destState } = req.body;

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ 
        error: 'Missing required fields: originCity, originState, destCity, destState' 
      });
    }

    console.log(`🎯 INTELLIGENCE API: Starting pairing for ${originCity}, ${originState} → ${destCity}, ${destState}`);

    const result = await generateGeographicCrawlPairs(
      originCity,
      originState,
      destCity,
      destState
    );

    console.log(`✅ INTELLIGENCE API: Generated ${result.length} pairs`);

    res.status(200).json({
      success: true,
      pairs: result,
      count: result.length
    });

  } catch (error) {
    console.error('❌ Intelligence API error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate intelligence pairs',
      success: false,
      pairs: []
    });
  }
}