// pages/api/debug-intelligent-crawl.js
import { adminSupabase } from '../../utils/supabaseClient.js';
import { generateIntelligentCrawlPairs } from '../../lib/intelligentCrawl.js';

export default async function handler(req, res) {
  try {
    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await adminSupabase
      .from('cities')
      .select('city, state_or_province, latitude, longitude, kma_code')
      .limit(3);
    
    if (testError) {
      return res.json({
        success: false,
        error: 'Database connection failed',
        details: testError
      });
    }

    console.log('✅ Database connection successful');
    console.log('Sample data:', testData);

    // Test with specific origin/destination that should work
    const origin = { city: 'New York', state: 'NY' };
    const destination = { city: 'Los Angeles', state: 'CA' };
    
    console.log('🔍 Testing intelligent crawl generation...');
    const result = await generateIntelligentCrawlPairs({
      origin,
      destination,
      equipment: 'V',
      preferFillTo10: true,
      usedCities: new Set(),
      userId: 'debug_test'
    });

    // Check each step
    console.log('Result structure:', {
      hasBaseOrigin: !!result.baseOrigin,
      hasBaseDest: !!result.baseDest,
      pairsCount: result.pairs ? result.pairs.length : 0,
      usedCitiesCount: result.usedCities ? result.usedCities.size : 0
    });

    return res.json({
      success: true,
      database: {
        connected: true,
        sampleData: testData
      },
      crawlTest: {
        origin,
        destination,
        result: {
          baseOrigin: result.baseOrigin,
          baseDest: result.baseDest,
          pairsGenerated: result.pairs ? result.pairs.length : 0,
          pairs: result.pairs || [],
          usedCitiesCount: result.usedCities ? result.usedCities.size : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    return res.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
