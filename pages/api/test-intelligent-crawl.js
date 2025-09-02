// Test intelligent crawl specifically for McDavid, FL
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing intelligent crawl for McDavid, FL -> Statesville, NC...');
    
    const result = await generateIntelligentCrawlPairs({
      origin: { city: 'McDavid', state: 'FL' },
      destination: { city: 'Statesville', state: 'NC' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set(),
      userId: 'test_user'
    });
    
    console.log('Intelligent crawl result:', JSON.stringify(result, null, 2));
    
    res.status(200).json({
      success: true,
      testLane: 'McDavid, FL -> Statesville, NC',
      crawlResult: result,
      baseOriginHasCoords: !!(result.baseOrigin?.latitude && result.baseOrigin?.longitude),
      baseDestHasCoords: !!(result.baseDest?.latitude && result.baseDest?.longitude),
      pairCount: result.pairs?.length || 0
    });
    
  } catch (error) {
    console.error('Intelligent crawl test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
