// /pages/api/verify-intelligence-api.js

/**
 * Server-side API endpoint to verify the intelligence-pairing API
 * This runs in the production environment with access to environment variables and network connectivity
 */
export default async function handler(req, res) {
  console.log('Starting intelligence API verification...');
  
  // Allow both GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }
  
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // Verify environment variables are available
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      HERE_API_KEY: Boolean(process.env.HERE_API_KEY),
    };

    console.log('Environment variables check:', envCheck);
    
    if (!envCheck.NEXT_PUBLIC_SUPABASE_URL || !envCheck.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: 'Missing environment variables',
        details: envCheck,
        success: false
      });
    }
    
    // Get authentication credentials from request or use defaults
    const email = req.body?.email || 'aconnellan@tql.com';
    const password = req.body?.password || 'Drodo4492';
    
    console.log('Using credentials:', { email });
    
    // Initialize Supabase client
    const supabase = supabaseAdmin;
    
    console.log('Authenticating with Supabase...');
    
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({
        error: 'Authentication failed',
        details: authError,
        success: false
      });
    }
    
    const token = authData.session.access_token;
    console.log('Authentication successful, token received');
    
    // Test lanes - geographically diverse
    const testLanes = [
      { origin_city: 'Cincinnati', origin_state: 'OH', origin_zip: '45202', dest_city: 'Columbus', dest_state: 'OH', dest_zip: '43215' },
      { origin_city: 'Chicago', origin_state: 'IL', origin_zip: '60601', dest_city: 'Indianapolis', dest_state: 'IN', dest_zip: '46204' },
      { origin_city: 'Atlanta', origin_state: 'GA', origin_zip: '30303', dest_city: 'Nashville', dest_state: 'TN', dest_zip: '37203' },
      { origin_city: 'Dallas', origin_state: 'TX', origin_zip: '75201', dest_city: 'Houston', dest_state: 'TX', dest_zip: '77002' },
      { origin_city: 'Seattle', origin_state: 'WA', origin_zip: '98101', dest_city: 'Portland', dest_state: 'OR', dest_zip: '97201' },
    ];
    
    const results = [];
    
    // Test each lane against the intelligence API
    for (const lane of testLanes) {
      console.log(`Testing lane: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);
      
      try {
        // Call the intelligence-pairing API
        const apiResponse = await fetch(
          // Use internal URL to prevent CORS issues
          `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/intelligence-pairing`, 
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(lane)
          }
        );
        
        const data = await apiResponse.json();
        
        if (!apiResponse.ok) {
          console.error(`API error (${apiResponse.status}):`, data);
          results.push({
            success: false,
            status: apiResponse.status,
            error: data,
            lane
          });
          continue;
        }
        
        // Analyze KMA diversity
        const kmaSet = new Set();
        if (data.matches && Array.isArray(data.matches)) {
          data.matches.forEach(match => {
            if (match.kma_code) {
              kmaSet.add(match.kma_code);
            }
          });
        }
        
        const uniqueKmas = kmaSet.size;
        const hasEnoughKmas = uniqueKmas >= 5;
        
        console.log(`API response received: ${data.matches ? data.matches.length : 0} matches`);
        console.log(`Unique KMAs: ${uniqueKmas} ${hasEnoughKmas ? '✅' : '❌'}`);
        
        results.push({
          success: apiResponse.ok,
          status: apiResponse.status,
          matches: data.matches ? data.matches.length : 0,
          uniqueKmas,
          hasEnoughKmas,
          lane,
          matchDetails: data.matches?.slice(0, 5) || [] // Include first 5 matches for inspection
        });
      } catch (error) {
        console.error('API request failed:', error.message);
        results.push({
          success: false,
          error: error.message,
          lane
        });
      }
    }
    
    // Analyze KMA distribution
    const kmaFrequency = {};
    const kmaTotal = {
      total: 0,
      uniqueTotal: 0
    };
    
    results.forEach(result => {
      if (result.success && result.matchDetails) {
        result.matchDetails.forEach(match => {
          if (match.kma_code) {
            kmaFrequency[match.kma_code] = (kmaFrequency[match.kma_code] || 0) + 1;
            kmaTotal.total++;
          }
        });
      }
      if (result.uniqueKmas) {
        kmaTotal.uniqueTotal += result.uniqueKmas;
      }
    });
    
    const kmaAnalysis = {
      kmaFrequency,
      kmaDistribution: Object.keys(kmaFrequency).length,
      kmaAverage: results.length > 0 ? kmaTotal.uniqueTotal / results.length : 0,
      kmaTotal: kmaTotal.total
    };
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      kmaRequirementsMet: results.filter(r => r.hasEnoughKmas).length,
      kmaAnalysis,
      results
    };
    
    // Return the verification results
    return res.status(200).json(summary);
    
  } catch (error) {
    console.error('Server verification failed:', error.message);
    return res.status(500).json({
      error: 'Server verification failed',
      details: error.message,
      success: false
    });
  }
}