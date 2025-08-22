// pages/api/test-crawl.js
import { generateCrawlPairs } from '../../lib/datcrawl.js';

export default async function handler(req, res) {
  try {
    console.log('=== CRAWL TEST START ===');
    
    const result = await generateCrawlPairs({
      origin: { city: 'Belvidere', state: 'IL' },
      destination: { city: 'Schofield', state: 'WI' },
      equipment: 'FD',
      preferFillTo10: true
    });
    
    console.log('=== CRAWL TEST RESULT ===');
    console.log('Pairs generated:', result.pairs.length);
    console.log('Shortfall reason:', result.shortfallReason);
    console.log('First 3 pairs:', result.pairs.slice(0, 3));
    
    res.status(200).json({
      success: true,
      pairs: result.pairs.length,
      shortfall: result.shortfallReason,
      samplePairs: result.pairs.slice(0, 3).map(p => `${p.pickup.city}, ${p.pickup.state} -> ${p.delivery.city}, ${p.delivery.state}`)
    });
    
  } catch (error) {
    console.error('CRAWL TEST ERROR:', error);
    res.status(500).json({ error: error.message });
  }
}
