// pages/api/generateIntelligentPairs.js
// Server-side API to generate intelligent pairs using Learning Intelligence System

import { generateLearningIntelligentPairs } from '../../lib/intelligentLearningSystem.js';
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';
import { validateApiAuth } from '../../middleware/auth.unified.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Temporarily skip auth to test intelligence generation
    // const authResult = await validateApiAuth(req);
    // if (!authResult.authenticated) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const { origin, destination, equipment } = req.body;

    if (!origin?.city || !origin?.state || !destination?.city || !destination?.state || !equipment) {
      return res.status(400).json({ 
        error: 'Missing required fields: origin.city, origin.state, destination.city, destination.state, equipment' 
      });
    }

    console.log(`🎯 API: Generating intelligent pairs for ${origin.city}, ${origin.state} -> ${destination.city}, ${destination.state} (${equipment})`);

    // Try the Learning Intelligence System first
    try {
      const result = await generateLearningIntelligentPairs({
        origin,
        destination,
        equipment,
        preferFillTo10: true,
        usedCities: new Set()
      });

      if (result?.pairs?.length >= 6) {
        console.log(`✅ Learning Intelligence generated ${result.pairs.length} pairs`);
        return res.status(200).json({
          success: true,
          pairs: result.pairs,
          system: 'learning',
          learningStats: result.learningStats || null
        });
      }
    } catch (learningError) {
      console.warn('⚠️ Learning Intelligence failed, trying Geographic Crawl:', learningError.message);
    }

    // Fallback to Geographic Crawl system
    try {
      const result = await generateGeographicCrawlPairs({
        origin,
        destination,
        equipment,
        preferFillTo10: true,
        usedCities: new Set()
      });

      if (result?.pairs?.length >= 6) {
        console.log(`✅ Geographic Crawl generated ${result.pairs.length} pairs`);
        return res.status(200).json({
          success: true,
          pairs: result.pairs,
          system: 'geographic',
          geographic: result.geographic || null
        });
      }
    } catch (geoError) {
      console.error('❌ Geographic Crawl also failed:', geoError.message);
    }

    // If both systems fail, return minimal pairs
    console.warn('⚠️ Both intelligence systems failed, returning base pair only');
    return res.status(200).json({
      success: true,
      pairs: [{
        pickup: { city: origin.city, state: origin.state, kma_code: null },
        delivery: { city: destination.city, state: destination.state, kma_code: null }
      }],
      system: 'fallback',
      warning: 'Intelligence systems failed - using basic pair only'
    });

  } catch (error) {
    console.error('❌ API Error generating intelligent pairs:', error);
    return res.status(500).json({ 
      error: 'Failed to generate intelligent pairs',
      details: error.message 
    });
  }
}
