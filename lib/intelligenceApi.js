// lib/intelligenceApi.js
// Client library for making calls to the intelligence-pairing API

/**
 * Fetches intelligence pairs from the intelligence-pairing API
 * @param {Object} params - Parameters for the intelligence pairing
 * @param {string} params.originCity - Origin city name
 * @param {string} params.originState - Origin state code
 * @param {string} params.originZip - Origin ZIP code (optional)
 * @param {string} params.destCity - Destination city name
 * @param {string} params.destState - Destination state code
 * @param {string} params.destZip - Destination ZIP code (optional)
 * @param {string} params.equipmentCode - Equipment code
 * @param {boolean} params.test_mode - Set to true to use test mode
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Object>} - Intelligence pairs result
 */
export async function fetchIntelligencePairs(params, supabase) {
  try {
    // If running in server-side context and we have supabase
    if (typeof window === 'undefined' && supabase) {
      // Make a direct API call to the intelligence-pairing endpoint
      // Get base URL from environment if available
      const baseUrl = process.env.VERCEL_URL ? 
        `https://${process.env.VERCEL_URL}` : 
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      const url = `${baseUrl}/api/intelligence-pairing`;

      // Get auth token from supabase if available
      let token = null;
      
      // Since we're running server-side, we'll use test_mode
      // for verification purposes
      const requestParams = {
        ...params,
        test_mode: true // Enable test mode for verification
      };

      // Make the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestParams),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      if (typeof window !== 'undefined') {
        console.log('🔢 Intelligence (SSR) stats:', {
          totalCityPairs: data.totalCityPairs,
          uniqueOriginKmas: data.uniqueOriginKmas,
          uniqueDestKmas: data.uniqueDestKmas,
          pairCount: Array.isArray(data.pairs) ? data.pairs.length : 0
        });
      }
      return data;
    } 
    // Client-side or no supabase instance
    else {
      throw new Error('Cannot call intelligence API without proper context');
    }
  } catch (error) {
    console.error('Error fetching intelligence pairs:', error);
    return { error: error.message };
  }
}