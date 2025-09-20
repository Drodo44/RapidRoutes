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

    // Fetch coordinates for origin and destination cities
    const { adminSupabase } = await import('../../utils/supabaseClient.js');
    
    // Fetch origin coordinates
    const { data: originData, error: originError } = await adminSupabase
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
    const { data: destData, error: destError } = await adminSupabase
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

    // Now call with complete data
    const result = await generateGeographicCrawlPairs(origin, destination);

    if (!result || !Array.isArray(result.pairs)) {
      throw new Error('Invalid response from intelligence system');
    }

    // Import the normalization function
    const { normalizePairing } = await import('../../lib/validatePairings.js');
    
    // Normalize all pairs to ensure consistent format
    let pairs = result.pairs.map(pair => normalizePairing(pair));
    
    // Filter out any null/invalid pairs after normalization
    pairs = pairs.filter(pair => pair !== null);
    
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
    // Enhanced error logging with full stack trace for Vercel debugging
    console.error('❌ Intelligence API error:', error);
    console.error('Stack trace:', error.stack);
    
    // Return detailed error information in JSON response
    res.status(500).json({ 
      error: true,
      message: error.message || 'Failed to generate intelligence pairs',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      success: false,
      pairs: []
    });
  }
}