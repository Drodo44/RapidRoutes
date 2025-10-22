// Quick production environment test
import supabaseAdmin from "@/lib/supabaseAdmin";
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  try {
    console.log('🧪 PRODUCTION TEST: Testing environment and database connection');
    
    // Test 1: Database connection
    const { data: testCities, error: dbError } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .limit(1);
    
    if (dbError) {
      return res.status(500).json({ error: 'Database connection failed', details: dbError.message });
    }
    
    console.log('✅ Database connection working, sample city:', testCities?.[0]);
    
    // Test 2: Simple intelligent crawl test
    const testResult = await generateIntelligentCrawlPairs({
      origin: { city: 'Belvidere', state: 'IL' },
      destination: { city: 'Schofield', state: 'WI' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set()
    });
    
    console.log('🎯 Crawl test result:', {
      hasPairs: !!testResult.pairs,
      pairsCount: testResult.pairs?.length || 0,
      hasBaseOrigin: !!testResult.baseOrigin,
      hasBaseDest: !!testResult.baseDest,
      error: testResult.error || 'none'
    });
    
    res.status(200).json({
      success: true,
      database: { connected: true, sampleCity: testCities?.[0] },
      crawlTest: {
        pairsGenerated: testResult.pairs?.length || 0,
        hasBaseOrigin: !!testResult.baseOrigin,
        hasBaseDest: !!testResult.baseDest,
        error: testResult.error || null
      }
    });
    
  } catch (error) {
    console.error('🚨 PRODUCTION TEST FAILED:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
