// /pages/api/verify-api.js
// This endpoint will verify the intelligence-pairing API directly in the production environment

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Only allow POST requests with proper authorization
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract email and password from request body
  const { email, password } = req.body;
  
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
      attempted: false,
      successful: false,
      error: null
    },
    api: {
      attempted: false,
      successful: false,
      error: null,
      pairs: 0,
      uniqueKmas: 0
    },
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
    results.auth.attempted = true;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      results.auth.error = error.message;
      return res.status(401).json(results);
    }

    results.auth.successful = true;
    const token = data.session.access_token;

    // Step 3: Call intelligence-pairing API
    results.api.attempted = true;
    const apiResponse = await fetch(`${req.headers.host.startsWith('localhost') ? 'http' : 'https'}://${req.headers.host}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testLane)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      results.api.error = `API returned ${apiResponse.status}: ${errorText}`;
      return res.status(500).json(results);
    }

    // Step 4: Process API response
    const apiData = await apiResponse.json();
    if (!apiData.success || !apiData.pairs || !Array.isArray(apiData.pairs)) {
      results.api.error = 'Invalid API response format';
      return res.status(500).json(results);
    }

    // Step 5: Count unique KMAs
    const uniqueKmas = new Set();
    apiData.pairs.forEach(pair => {
      const originKma = pair.origin_kma || pair.originKma;
      const destKma = pair.dest_kma || pair.destKma;
      
      if (originKma) uniqueKmas.add(originKma);
      if (destKma) uniqueKmas.add(destKma);
    });

    // Set success results
    results.api.successful = true;
    results.api.pairs = apiData.pairs.length;
    results.api.uniqueKmas = uniqueKmas.size;
    results.api.kmas = Array.from(uniqueKmas);

    // Return results
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({
      ...results,
      error: error.message
    });
  }
}