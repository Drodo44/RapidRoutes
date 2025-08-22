// Quick test script to debug crawl generation
import { generateCrawlPairs } from './lib/datcrawl.js';

// Mock minimal environment for testing
globalThis.console = console;

async function testCrawl() {
  try {
    console.log('Testing crawl generation with Fill-to-5...');
    
    const result = await generateCrawlPairs({
      origin: { city: 'Maplesville', state: 'AL' },
      destination: { city: 'Sweetwater', state: 'TN' },
      equipment: 'FD',
      preferFillTo10: true
    });
    
    console.log('CRAWL RESULT:');
    console.log('- Base Origin:', result.baseOrigin);
    console.log('- Base Dest:', result.baseDest);
    console.log('- Pairs generated:', result.pairs.length);
    console.log('- Pairs:', result.pairs);
    console.log('- Count:', result.count);
    console.log('- Shortfall reason:', result.shortfallReason);
    
  } catch (error) {
    console.error('CRAWL TEST ERROR:', error);
  }
}

testCrawl();
