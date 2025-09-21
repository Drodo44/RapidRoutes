// /pages/api/verify-api.js
// This endpoint will verify the intelligence-pairing API directly in the production environment
// Version 2.0: Enhanced with full diagnostics

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Allow GET for simplified testing with query params, POST for secure body
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract email and password from request body or query params
  // NOTE: Query params only for testing - real applications should use POST body
  const email = req.body?.email || req.query?.email;
  const password = req.body?.password || req.query?.password;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  // Initialize verification results
  const results = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
      HERE_API_KEY: Boolean(process.env.HERE_API_KEY)
    },
    auth: {
      status: 'pending',
      method: 'password',
      token_ok: false,
      error: null
    },
    api: {
      url: '/api/intelligence-pairing',
      status: null,
      time_ms: null,
      error: null
    },
    pairs_count: 0,
    unique_kmas: 0,
    kma_details: [],
    sample_pairs: [],
    fixes_applied: [],
    suggested_next_steps: [],
    timestamp: new Date().toISOString()
  };

  // Test lane data
  const testLane = {
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    destCity: 'Atlanta', 
    destState: 'GA',
    destZip: '30303',
    equipmentCode: 'FD'
  };

  try {
    // Step 1: Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    );

    // Step 2: Authenticate with Supabase
    const authStartTime = Date.now();
    let authData;
    
    // Try password authentication
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        results.auth.error = error.message;
        results.auth.status = 'fail';
        results.suggested_next_steps.push(
          'Check user credentials',
          'Verify Supabase authentication configuration'
        );
        return res.status(401).json(results);
      }
      
      authData = data;
      results.auth.status = 'ok';
      results.auth.method = 'password';
    } catch (authError) {
      results.auth.error = authError.message;
      results.auth.status = 'error';
      results.suggested_next_steps.push('Check Supabase connectivity');
      return res.status(500).json(results);
    }
    
    results.auth.time_ms = Date.now() - authStartTime;
    results.auth.token_ok = true;
    const token = authData.session.access_token;

    // Step 3: Call intelligence-pairing API
    const apiUrl = `${req.headers.host.startsWith('localhost') ? 'http' : 'https'}://${req.headers.host}/api/intelligence-pairing`;
    results.api.url = apiUrl;
    
    const apiStartTime = Date.now();
    let apiResponse, apiResponseText, apiData;
    
    try {
      apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(testLane)
      });
      
      results.api.status = apiResponse.status;
      results.api.time_ms = Date.now() - apiStartTime;
      
      // Get full response text
      apiResponseText = await apiResponse.text();
      
      if (!apiResponse.ok) {
        results.api.error = `API returned ${apiResponse.status}: ${apiResponseText.substring(0, 500)}`;
        
        if (apiResponse.status === 401) {
          results.auth.token_ok = false;
          results.suggested_next_steps.push(
            'Check token extraction in intelligence-pairing.js',
            'Verify Bearer prefix handling in API authentication'
          );
        } else if (apiResponse.status === 500) {
          results.suggested_next_steps.push(
            'Check server logs for detailed error',
            'Verify error handling in intelligence-pairing.js'
          );
        }
        
        return res.status(200).json(results); // Return 200 with diagnostic info
      }
      
      // Try to parse as JSON
      try {
        apiData = JSON.parse(apiResponseText);
      } catch (jsonError) {
        results.api.error = `Invalid JSON response: ${jsonError.message}`;
        results.api.response_sample = apiResponseText.substring(0, 1000);
        results.suggested_next_steps.push('Fix JSON syntax in API response');
        return res.status(200).json(results);
      }
      
      // Check response format
      if (!apiData.success || !apiData.pairs || !Array.isArray(apiData.pairs)) {
        results.api.error = 'Invalid API response format';
        results.api.response_format = Object.keys(apiData);
        results.suggested_next_steps.push('Fix API response format - ensure "success" and "pairs" fields are present');
        return res.status(200).json(results);
      }
    } catch (apiError) {
      results.api.status = 'error';
      results.api.error = apiError.message;
      results.api.time_ms = Date.now() - apiStartTime;
      results.suggested_next_steps.push('Check API endpoint availability', 'Verify network connectivity');
      return res.status(200).json(results);
    }

    // Step 5: Analyze KMAs
    const uniqueKmas = new Set();
    const kmaStats = {};
    
    apiData.pairs.forEach(pair => {
      const originKma = pair.origin_kma || pair.originKma;
      const destKma = pair.dest_kma || pair.destKma;
      
      if (originKma) uniqueKmas.add(originKma);
      if (destKma) uniqueKmas.add(destKma);
      
      // Track detailed KMA statistics
      if (originKma) {
        if (!kmaStats[originKma]) kmaStats[originKma] = { code: originKma, origin_count: 0, dest_count: 0 };
        kmaStats[originKma].origin_count++;
      }
      
      if (destKma) {
        if (!kmaStats[destKma]) kmaStats[destKma] = { code: destKma, origin_count: 0, dest_count: 0 };
        kmaStats[destKma].dest_count++;
      }
    });
    
    // Check if minimum KMA requirement is met
    const kmaCount = uniqueKmas.size;
    if (kmaCount < 5) {
      results.suggested_next_steps.push(
        'Check geographicCrawl.js to ensure minimum 5 unique KMAs',
        'Verify search radius configuration (should be up to 100 miles)',
        'Check KMA diversity requirements in intelligence pairing'
      );
    }

    // Set success results
    results.api.successful = true;
    results.pairs_count = apiData.pairs.length;
    results.unique_kmas = uniqueKmas.size;
    results.kma_details = Object.values(kmaStats);
    results.sample_pairs = apiData.pairs.slice(0, 10);
    
    // Return results
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      ...results,
      error: error.message
    });
  }
}