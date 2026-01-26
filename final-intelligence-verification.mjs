// final-intelligence-verification.mjs
// Comprehensive verification script for RapidRoutes intelligence-pairing API

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Configuration
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oerbzpitbwqugvgcywlc.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test lane pairs - diverse geographic locations
const testLanes = [
  { origin_city: 'Cincinnati', origin_state: 'OH', origin_zip: '45202', dest_city: 'Columbus', dest_state: 'OH', dest_zip: '43215' },
  { origin_city: 'Chicago', origin_state: 'IL', origin_zip: '60601', dest_city: 'Indianapolis', dest_state: 'IN', dest_zip: '46204' },
  { origin_city: 'Atlanta', origin_state: 'GA', origin_zip: '30303', dest_city: 'Nashville', dest_state: 'TN', dest_zip: '37203' },
  { origin_city: 'Dallas', origin_state: 'TX', origin_zip: '75201', dest_city: 'Houston', dest_state: 'TX', dest_zip: '77002' },
  { origin_city: 'Seattle', origin_state: 'WA', origin_zip: '98101', dest_city: 'Portland', dest_state: 'OR', dest_zip: '97201' },
];

// Email and password for authentication
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Usage: node final-intelligence-verification.mjs <email> <password>');
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is missing.');
  console.error('Run with: NEXT_PUBLIC_SUPABASE_ANON_KEY=<key> node final-intelligence-verification.mjs <email> <password>');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function authenticateUser(email, password) {
  console.log(`🔐 Authenticating with Supabase: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }

    console.log('✅ Authentication successful');
    return data.session.access_token;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    throw error;
  }
}

async function testIntelligenceAPI(token, lane) {
  console.log(`\n🔍 Testing lane: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lane)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ API error (${response.status}):`, data);
      return {
        success: false,
        status: response.status,
        error: data,
        lane
      };
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
    
    console.log(`✅ API response received: ${data.matches ? data.matches.length : 0} matches`);
    console.log(`🔢 Unique KMAs: ${uniqueKmas} ${hasEnoughKmas ? '✅' : '❌'}`);
    
    return {
      success: response.ok,
      status: response.status,
      matches: data.matches ? data.matches.length : 0,
      uniqueKmas,
      hasEnoughKmas,
      lane,
      matchDetails: data.matches?.slice(0, 5) || [] // Include first 5 matches for inspection
    };
  } catch (error) {
    console.error('❌ API request failed:', error.message);
    return {
      success: false,
      error: error.message,
      lane
    };
  }
}

async function analyzeKmaDistribution(allResults) {
  const kmaFrequency = {};
  const kmaTotal = {
    total: 0,
    uniqueTotal: 0
  };
  
  allResults.forEach(result => {
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
  
  return {
    kmaFrequency,
    kmaDistribution: Object.keys(kmaFrequency).length,
    kmaAverage: allResults.length > 0 ? kmaTotal.uniqueTotal / allResults.length : 0,
    kmaTotal: kmaTotal.total
  };
}

async function main() {
  console.log('🚀 Starting RapidRoutes Intelligence API Verification');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🌐 API URL: ${API_URL}`);
  
  try {
    // Authenticate and get token
    const token = await authenticateUser(email, password);
    
    // Test all lanes
    const results = [];
    for (const lane of testLanes) {
      const result = await testIntelligenceAPI(token, lane);
      results.push(result);
    }
    
    // Analyze KMA distribution
    const kmaAnalysis = await analyzeKmaDistribution(results);
    
    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      apiUrl: API_URL,
      totalTests: results.length,
      successfulTests: results.filter(r => r.success).length,
      failedTests: results.filter(r => !r.success).length,
      kmaRequirementsMet: results.filter(r => r.hasEnoughKmas).length,
      kmaAnalysis,
      results
    };
    
    // Generate report
    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log('====================');
    console.log(`Total tests: ${summary.totalTests}`);
    console.log(`Successful API calls: ${summary.successfulTests}`);
    console.log(`Failed API calls: ${summary.failedTests}`);
    console.log(`Tests meeting KMA requirements: ${summary.kmaRequirementsMet}`);
    console.log(`Average unique KMAs per test: ${kmaAnalysis.kmaAverage.toFixed(2)}`);
    console.log(`Total KMA distribution: ${kmaAnalysis.kmaDistribution}`);
    
    // Save results to file
    await fs.writeFile(
      'intelligence-verification-results.json', 
      JSON.stringify(summary, null, 2)
    );
    
    console.log('\n✅ Verification complete. Results saved to intelligence-verification-results.json');
    
    // Final status
    if (summary.successfulTests === summary.totalTests && summary.kmaRequirementsMet === summary.totalTests) {
      console.log('🎉 ALL TESTS PASSED: API is functioning correctly with proper KMA diversity');
    } else {
      console.log('⚠️ SOME TESTS FAILED: Review the detailed results for more information');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();