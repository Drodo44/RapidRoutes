#!/usr/bin/env node
/**
 * RapidRoutes Authentication Flow Verification
 * This script tests each part of the authentication flow to identify issues
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const vercelUrl = process.argv[2] || 'http://localhost:3000';
const testEmail = process.argv[3];
const testPassword = process.argv[4];

// Test data
const testLaneData = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

async function verifyAuthenticationFlow() {
  console.log('🔍 RapidRoutes Authentication Flow Verification');
  console.log('==============================================\n');
  
  // Check environment variables
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables. Please provide:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  if (!testEmail || !testPassword) {
    console.log('⚠️ No login credentials provided, running in limited mode');
    console.log('  Usage: node verify-auth-flow.js [vercel-url] [email] [password]\n');
  }
  
  console.log(`🌐 Target API: ${vercelUrl}`);
  
  // Step 1: Test basic API health
  console.log('\n📡 Step 1: Testing API health');
  try {
    const verifyEndpoint = `${vercelUrl}/api/deployment-verification`;
    console.log(`  Checking ${verifyEndpoint}`);
    
    const verifyResponse = await fetch(verifyEndpoint);
    console.log(`  Status: ${verifyResponse.status}`);
    
    if (verifyResponse.headers.get('content-type')?.includes('application/json')) {
      const verifyData = await verifyResponse.json();
      console.log(`  ✅ Response: ${JSON.stringify(verifyData)}`);
    } else {
      const text = await verifyResponse.text();
      console.log(`  ❌ Non-JSON response (first 100 chars): ${text.substring(0, 100)}...`);
      console.log('  ❌ API is not returning JSON. Deployment issue detected.');
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // If login credentials provided, continue with authentication tests
  if (testEmail && testPassword) {
    // Step 2: Test authentication with Supabase
    console.log('\n📡 Step 2: Testing Supabase authentication');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    try {
      console.log(`  Logging in with provided credentials`);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (error) {
        console.log(`  ❌ Authentication failed: ${error.message}`);
        process.exit(1);
      }
      
      if (data?.session?.access_token) {
        console.log('  ✅ Authentication successful');
        console.log(`  ✅ Token received (first 20 chars): ${data.session.access_token.substring(0, 20)}...`);
        
        // Step 3: Test token verification endpoint
        console.log('\n📡 Step 3: Testing token verification');
        try {
          const verifyTokenEndpoint = `${vercelUrl}/api/verify-intelligence`;
          console.log(`  Checking ${verifyTokenEndpoint}`);
          
          const verifyTokenResponse = await fetch(verifyTokenEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({ test: true })
          });
          
          console.log(`  Status: ${verifyTokenResponse.status}`);
          
          if (verifyTokenResponse.headers.get('content-type')?.includes('application/json')) {
            const verifyTokenData = await verifyTokenResponse.json();
            console.log(`  Response: ${JSON.stringify(verifyTokenData, null, 2)}`);
            
            if (verifyTokenData.success) {
              console.log('  ✅ Token verification successful');
              
              // Step 4: Test intelligence pairing endpoint
              console.log('\n📡 Step 4: Testing intelligence pairing endpoint');
              try {
                const pairingEndpoint = `${vercelUrl}/api/intelligence-pairing`;
                console.log(`  Checking ${pairingEndpoint}`);
                
                const pairingResponse = await fetch(pairingEndpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.session.access_token}`
                  },
                  body: JSON.stringify(testLaneData)
                });
                
                console.log(`  Status: ${pairingResponse.status}`);
                
                if (pairingResponse.headers.get('content-type')?.includes('application/json')) {
                  const pairingData = await pairingResponse.json();
                  console.log(`  Response: ${JSON.stringify({
                    success: pairingData.success,
                    error: pairingData.error,
                    details: pairingData.details,
                    pairCount: pairingData.pairs?.length
                  }, null, 2)}`);
                  
                  if (pairingData.success && Array.isArray(pairingData.pairs)) {
                    console.log(`  ✅ Intelligence pairing successful with ${pairingData.pairs.length} pairs`);
                  } else {
                    console.log(`  ❌ Intelligence pairing failed: ${pairingData.error || 'Unknown error'}`);
                  }
                } else {
                  const text = await pairingResponse.text();
                  console.log(`  ❌ Non-JSON response (first 100 chars): ${text.substring(0, 100)}...`);
                }
              } catch (error) {
                console.log(`  ❌ Error: ${error.message}`);
              }
            } else {
              console.log(`  ❌ Token verification failed: ${verifyTokenData.error || 'Unknown error'}`);
            }
          } else {
            const text = await verifyTokenResponse.text();
            console.log(`  ❌ Non-JSON response (first 100 chars): ${text.substring(0, 100)}...`);
          }
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  // Final summary
  console.log('\n📊 Verification Summary:');
  console.log('1. If API returns HTML instead of JSON: The Vercel deployment has routing issues');
  console.log('   - Fix: Deploy with correct Next.js configuration using fix-deployment.js');
  console.log('2. If authentication fails: Check Supabase credentials and environment variables');
  console.log('3. If token verification fails: Debug JWT extraction and validation in API');
  console.log('4. If intelligence pairing fails but verification passes: Issue with the intelligence system');
}

verifyAuthenticationFlow();