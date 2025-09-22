// server-api-verification.js
// Create a Next.js API route that tests the intelligence-pairing API directly

import { createClient } from '@supabase/supabase-js';

// In-memory cache for API response
let apiResponseCache = null;

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Return cached response if available
  if (apiResponseCache) {
    return res.status(200).json(apiResponseCache);
  }
  
  // Start verification process
  console.log('Starting intelligence API verification...');
  
  try {
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
    
    // Credentials
    const email = 'aconnellan@tql.com';
    const password = 'Drodo4492';
    
    console.log('Authenticating with Supabase...');
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
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
    ];
    
    const results = [];
    
    // Test each lane against the intelligence API
    for (const lane of testLanes) {
      console.log(`Testing lane: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);
      
      try {
        // Call the intelligence-pairing API
        const apiResponse = await fetch(
          // Use same-origin URL for API call
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
    
    // Cache the response
    apiResponseCache = summary;
    
    // Return the verification results
    return res.status(200).json(summary);
    
  } catch (error) {
    console.error('Server verification failed:', error);
    return res.status(500).json({
      error: 'Server verification failed',
      details: error.message,
      success: false
    });
  }
}