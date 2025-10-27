// pages/api/bypass-auth-for-testing.js
// IMPORTANT: This is a temporary testing endpoint and should be removed after verification
// It bypasses authentication for testing purposes only

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only POST requests are supported'
    });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { originCity, originState, destCity, destState } = req.body;

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ 
        error: 'Bad Request',
        details: 'Missing required fields: originCity, originState, destCity, destState'
      });
    }

    // Fetch origin coordinates from database
    const { data: originData, error: originError } = await supabase
      .from('cities')
      .select('latitude, longitude, zip')
      .eq('city', originCity)
      .eq('state_or_province', originState)
      .limit(1);
      
    if (originError) {
      throw new Error(`Failed to fetch origin coordinates: ${originError.message}`);
    }
    
    if (!originData || originData.length === 0) {
      throw new Error(`Origin city not found: ${originCity}, ${originState}`);
    }
    
    // Fetch destination coordinates
    const { data: destData, error: destError } = await supabase
      .from('cities')
      .select('latitude, longitude, zip')
      .eq('city', destCity)
      .eq('state_or_province', destState)
      .limit(1);
      
    if (destError) {
      throw new Error(`Failed to fetch destination coordinates: ${destError.message}`);
    }
    
    if (!destData || destData.length === 0) {
      throw new Error(`Destination city not found: ${destCity}, ${destState}`);
    }
    
    const origin = {
      city: originCity,
      state: originState,
      latitude: Number(originData[0].latitude),
      longitude: Number(originData[0].longitude),
      zip: originData[0].zip
    };
    
    const destination = {
      city: destCity,
      state: destState,
      latitude: Number(destData[0].latitude),
      longitude: Number(destData[0].longitude),
      zip: destData[0].zip
    };

    // Generate pairings
    const result = await generateGeographicCrawlPairs(origin, destination);

    if (!result || !Array.isArray(result.pairs)) {
      throw new Error('Invalid response from intelligence system');
    }

    // Import the normalization function
    const { normalizePairing } = await import('../../lib/validatePairings.js');
    
    // Normalize all pairs
    let pairs = result.pairs.map(pair => normalizePairing(pair));
    
    // Filter out any invalid pairs
    pairs = pairs.filter(pair => pair !== null);
    
    const count = pairs.length;

    if (count < 6) {
      console.warn(`⚠️ Generated only ${count} pairs, minimum required is 6`);
      return res.status(422).json({
        error: 'Insufficient pairs generated',
        pairs: [],
        count: 0,
        minRequired: 6
      });
    }

    console.log(`✅ Generated ${count} pairs`);

    res.status(200).json({
      success: true,
      pairs,
      count,
      debug: result?.debug || {}
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    res.status(500).json({ 
      error: 'Processing Error',
      details: error.message || 'Failed to generate pairs',
      success: false,
      pairs: []
    });
  }
}