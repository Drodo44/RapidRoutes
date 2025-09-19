// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';

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

    // Verify API authentication
    const authResult = await validateApiAuth(req);
    if (!authResult.authenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🎯 INTELLIGENCE API: Starting pairing for ${originCity}, ${originState} → ${destCity}, ${destState}`);

    const result = await generateGeographicCrawlPairs({
      origin: { city: originCity, state: originState },
      destination: { city: destCity, state: destState },
      preferFillTo10: true
    });

    if (!result || !Array.isArray(result.pairs)) {
      throw new Error('Invalid response from intelligence system');
    }

    const pairs = result.pairs;
    const count = pairs.length;

    if (count < 6) {
      console.warn(`⚠️ INTELLIGENCE API: Generated only ${count} pairs, minimum required is 6`);
      return res.status(422).json({
        error: 'Insufficient pairs generated',
        pairs: [],
        count: 0,
        minRequired: 6
      });
    }

    console.log(`✅ INTELLIGENCE API: Generated ${count} pairs`);

    res.status(200).json({
      success: true,
      pairs,
      count,
      debug: result?.debug || {}
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