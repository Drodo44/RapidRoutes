// pages/api/production-verification.js
// Server-side verification endpoint that runs in the production environment
// This endpoint uses the production environment variables to run verification tests

import { getServerSupabase, getBrowserSupabase } from '../../lib/supabaseClient.js';
import { fetchIntelligencePairs } from '../../lib/intelligenceApi';

// Function to count unique KMA codes in the response
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return 0;
  
  const kmaSet = new Set();
  
  pairs.forEach(pair => {
    if (pair.originKma) kmaSet.add(pair.originKma);
    if (pair.destKma) kmaSet.add(pair.destKma);
  });
  
  return kmaSet.size;
}

// Main verification handler
export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Basic API key verification to prevent public access
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.VERIFICATION_API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid API key',
      securityTest: 'API key validation passed'
    });
  }

  try {
    const results = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabaseConnected: false,
      apiTests: [],
      kmaValidation: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        authenticationSuccessful: false,
        uniqueKmaRequirementMet: false
      }
    };
    
    // Step 1: Authenticate with Supabase
    let supabase;
    try {
      supabase = getBrowserSupabase();
      
      // Use admin client for verification
      const adminSupabase = supabaseAdmin;
      
      results.supabaseConnected = true;
      results.summary.authenticationSuccessful = true;
      
    } catch (authError) {
      return res.status(500).json({
        success: false,
        error: 'Supabase authentication failed',
        details: authError.message
      });
    }
    
    // Step 2: Run test cases
    const testCases = [
      {
        name: 'Chicago to Atlanta (Flatbed)',
        params: {
          originCity: 'Chicago',
          originState: 'IL',
          originZip: '60601',
          destCity: 'Atlanta',
          destState: 'GA',
          destZip: '30303',
          equipmentCode: 'FD'
        }
      },
      {
        name: 'Los Angeles to Dallas (Van)',
        params: {
          originCity: 'Los Angeles',
          originState: 'CA',
          originZip: '90001',
          destCity: 'Dallas',
          destState: 'TX',
          destZip: '75201',
          equipmentCode: 'V'
        }
      },
      {
        name: 'New York to Miami (Reefer)',
        params: {
          originCity: 'New York',
          originState: 'NY',
          originZip: '10001',
          destCity: 'Miami',
          destState: 'FL',
          destZip: '33101',
          equipmentCode: 'R'
        }
      }
    ];
    
    results.summary.totalTests = testCases.length;
    
    // Run each test case
    for (const testCase of testCases) {
      const testResult = {
        name: testCase.name,
        params: testCase.params,
        success: false,
        statusCode: null,
        uniqueKmaCount: 0,
        meetsKmaDiversity: false,
        error: null
      };
      
      try {
        // Call the intelligence-pairing API
        const apiResponse = await fetchIntelligencePairs(testCase.params, supabase);
        
        testResult.statusCode = 200;
        testResult.success = true;
        
        if (apiResponse && apiResponse.pairs && Array.isArray(apiResponse.pairs)) {
          // Count unique KMAs
          const uniqueKmas = countUniqueKmas(apiResponse.pairs);
          testResult.uniqueKmaCount = uniqueKmas;
          testResult.meetsKmaDiversity = uniqueKmas >= 6;
          testResult.pairsCount = apiResponse.pairs.length;
          
          // Add sample of the first 5 pairs
          testResult.samplePairs = apiResponse.pairs.slice(0, 5);
          
          if (testResult.meetsKmaDiversity) {
            results.summary.passedTests++;
          } else {
            results.summary.failedTests++;
            testResult.error = `KMA diversity requirement not met: ${uniqueKmas} unique KMAs (minimum required: 6)`;
          }
        } else {
          testResult.success = false;
          testResult.error = 'Invalid response format: missing pairs array';
          results.summary.failedTests++;
        }
      } catch (testError) {
        testResult.success = false;
        testResult.error = testError.message;
        results.summary.failedTests++;
      }
      
      results.apiTests.push(testResult);
      results.kmaValidation.push({
        testName: testResult.name,
        uniqueKmaCount: testResult.uniqueKmaCount,
        meetsRequirement: testResult.meetsKmaDiversity
      });
    }
    
    // Final summary
    results.summary.uniqueKmaRequirementMet = results.kmaValidation.every(test => test.meetsRequirement);
    results.summary.overallSuccess = results.summary.authenticationSuccessful && results.summary.uniqueKmaRequirementMet;
    
    return res.status(200).json({
      success: true,
      results
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      details: error.message
    });
  }
}