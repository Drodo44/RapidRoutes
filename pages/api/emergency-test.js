// Emergency test endpoint to verify intelligence pairing API
// This endpoint allows testing the intelligence API directly without auth
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use GET request.' 
    });
  }

  try {
    // Import the handler directly to test it in-process
    const intelligencePairingHandler = require('./intelligence-pairing').default;

    // Create mock req and res objects
    const mockReq = {
      method: 'POST',
      body: {
        originCity: 'Atlanta',
        originState: 'GA',
        destCity: 'Chicago', 
        destState: 'IL',
        originLatitude: 33.7490,
        originLongitude: -84.3880,
        destLatitude: 41.8781,
        destLongitude: -87.6298,
        radius: 75,
        test_mode: true
      },
      headers: {
        'content-type': 'application/json'
      }
    };

    // Create a mock response object to capture the API response
    let responseData;
    const mockRes = {
      status: (code) => ({ 
        json: (data) => {
          responseData = data;
          responseData.statusCode = code;
          return mockRes;
        }
      })
    };

    // Call the handler directly
    await intelligencePairingHandler(mockReq, mockRes);

    // Simulate the response from fetch
    const response = {
      ok: responseData && responseData.success,
      status: responseData ? 200 : 500,
      json: async () => responseData
    };

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();

    // Check if we got actual pairs
    const pairCount = data.pairs?.length || 0;
    const originKmaCount = data.metadata?.uniqueOriginKmas || 0;
    const destKmaCount = data.metadata?.uniqueDestKmas || 0;

    // Add diagnostic info to the response
    const enhancedData = {
      ...data,
      diagnostics: {
        timestamp: new Date().toISOString(),
        pairsGenerated: pairCount,
        originKmaCount: originKmaCount,
        destKmaCount: destKmaCount,
        isEmergencyData: !!data.metadata?.emergency,
        supabaseAvailable: !!supabase,
        apiUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      }
    };

    return res.status(200).json(enhancedData);
  } catch (error) {
    console.error('Emergency test error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error testing intelligence API',
      error: error.message
    });
  }
}