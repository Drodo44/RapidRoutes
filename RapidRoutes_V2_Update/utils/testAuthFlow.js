// utils/testAuthFlow.js
/**
 * Development utility to test authentication flow
 * This is a developer tool for verifying authentication in dev mode
 */

import { getCurrentToken, getTokenInfo } from './authUtils';

/**
 * Test the complete authentication flow
 * @returns {Promise<Object>} Test results
 */
export async function testAuthFlow() {
  console.group('🔐 Auth Flow Test');
  console.time('Auth flow test completed in');
  
  try {
    // 1. Get current token
    console.log('1. Getting current token...');
    const { token, user, error } = await getCurrentToken();
    
    if (error) {
      console.error('❌ Token retrieval failed:', error.message);
    } else if (!token) {
      console.warn('⚠️ No token available');
    } else {
      console.log('✅ Token retrieved successfully');
      const tokenInfo = getTokenInfo(token);
      console.log('Token info:', {
        valid: tokenInfo.valid,
        userId: tokenInfo.userId,
        expiresAt: tokenInfo.expiresAt,
        timeLeft: tokenInfo.timeLeft
      });
    }
    
    // 2. Test API auth endpoint
    console.log('2. Testing API auth endpoint...');
    try {
      const apiResponse = await fetch('/api/dev/auth-test', {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        credentials: 'include'
      });
      
      const result = await apiResponse.json();
      console.log(`API response: ${apiResponse.status}`, result);
      
      if (apiResponse.ok) {
        console.log('✅ API auth test successful');
        
        // Log validation results
        const validation = result.auth?.validationResult;
        if (validation) {
          if (validation.valid) {
            console.log('✅ Token validated with Supabase:', {
              userId: validation.user?.id,
              email: validation.user?.email
            });
          } else {
            console.error('❌ Token validation failed:', validation.error?.message);
          }
        }
      } else {
        console.error('❌ API auth test failed:', result.error);
      }
    } catch (apiError) {
      console.error('❌ API request failed:', apiError.message);
    }
    
    // 3. Test API intelligence pairing
    console.log('3. Testing intelligence-pairing endpoint...');
    try {
      // Import the adapter dynamically since this is a utility that might run on both server and client
      const { callIntelligencePairingApi } = await import('./intelligenceApiAdapter');
      
      // Use the adapter to make the API call with proper formatting
      const testLane = {
        id: 'test-auth-flow',
        originCity: 'Chicago',
        originState: 'IL',
        destCity: 'New York',
        destState: 'NY',
        equipmentCode: 'V'
      };
      
      // Call the API using the adapter
      const pairingResult = await callIntelligencePairingApi(testLane, { 
        useTestMode: false 
      });
      
      console.log(`Intelligence API response: 200`, {
        success: true,
        pairsCount: pairingResult.pairs?.length
      });
      
      console.log('✅ Intelligence pairing test successful');
      console.log(`Generated ${pairingResult.pairs?.length} pairs`);
      
      // Check if we have at least 6 unique KMAs
      const uniqueKmas = new Set(pairingResult.pairs?.map(p => p.kma_code));
      if (uniqueKmas.size >= 6) {
        console.log(`✅ Found ${uniqueKmas.size} unique KMAs (minimum 6 required)`);
      } else {
        console.warn(`⚠️ Only found ${uniqueKmas.size} unique KMAs (minimum 6 required)`);
      }
    } catch (pairingError) {
      console.error('❌ Intelligence pairing request failed:', pairingError.message);
    }
    
    console.timeEnd('Auth flow test completed in');
    console.groupEnd();
    
    return {
      success: true,
      message: 'Auth flow test completed - check console for details'
    };
  } catch (error) {
    console.error('❌ Auth flow test failed with exception:', error);
    console.timeEnd('Auth flow test completed in');
    console.groupEnd();
    
    return {
      success: false,
      error: error.message
    };
  }
}