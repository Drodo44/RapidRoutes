// pages/api/simulate-test-mode.js
// A temporary endpoint to simulate test mode for verification

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  // Only allow POST requests to this endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only POST requests are supported',
      success: false
    });
  }

  try {
    // Extract parameters from request body
    const originCity = req.body.originCity || req.body.origin_city;
    const originState = req.body.originState || req.body.origin_state;
    const originZip = req.body.originZip || req.body.origin_zip;
    const destCity = req.body.destCity || req.body.dest_city;
    const destState = req.body.destState || req.body.dest_state;
    const destZip = req.body.destZip || req.body.dest_zip;
    const equipmentCode = req.body.equipmentCode || req.body.equipment_code;

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ 
        error: 'Bad Request',
        details: 'Missing required fields: originCity/origin_city, originState/origin_state, destCity/dest_city, destState/dest_state',
        success: false
      });
    }

    // Generate pairs using the geographic crawl algorithm
    const pairs = await generateGeographicCrawlPairs({
      originCity,
      originState,
      originZip,
      destCity,
      destState,
      destZip,
      equipmentCode
    });

    // Return the pairs
    return res.status(200).json({ 
      success: true, 
      pairs,
      meta: {
        isTestMode: true,
        timestamp: new Date().toISOString(),
        uniqueKmaCount: countUniqueKmas(pairs)
      }
    });
  } catch (error) {
    console.error('Error in simulate-test-mode endpoint:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
      success: false
    });
  }
}

// Helper function to count unique KMAs
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return 0;
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    // Handle both snake_case and camelCase formats
    const originKma = pair.origin_kma || pair.originKma;
    const destKma = pair.dest_kma || pair.destKma;
    
    if (originKma) allKmas.add(originKma);
    if (destKma) allKmas.add(destKma);
  });
  
  return allKmas.size;
}