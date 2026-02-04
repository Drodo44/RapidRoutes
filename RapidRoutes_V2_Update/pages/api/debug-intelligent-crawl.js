// pages/api/debug-intelligent-crawl.js

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // Initialize Supabase client
    const supabase = supabaseAdmin;

    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
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

    // Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    };

    // Simple test without complex imports
    const { data: originData, error: originError } = await supabase
      .from('cities')
      .select('*')
      .ilike('city', 'New York')
      .ilike('state_or_province', 'NY')
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    const { data: destData, error: destError } = await supabase
      .from('cities')
      .select('*')
      .ilike('city', 'Los Angeles')
      .ilike('state_or_province', 'CA')  
      .not('latitude', 'is', null)
      .not('kma_code', 'is', null)
      .limit(1);

    return res.json({
      success: true,
      environment: envCheck,
      database: {
        connected: true,
        sampleData: testData
      },
      originTest: {
        found: originData?.length > 0,
        data: originData?.[0],
        error: originError
      },
      destTest: {
        found: destData?.length > 0,
        data: destData?.[0], 
        error: destError
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
