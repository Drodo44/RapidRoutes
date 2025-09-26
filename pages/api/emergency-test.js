// Emergency test endpoint to verify intelligence pairing API
// This endpoint allows testing the intelligence API directly without auth
import { adminSupabase as supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed. Use GET request.' 
    });
  }

  try {
    // Make direct call to intelligence-pairing endpoint using server-side
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originCity: 'Atlanta',
        originState: 'GA',
        destCity: 'Chicago', 
        destState: 'IL',
        originLatitude: 33.7490,
        originLongitude: -84.3880,
        destLatitude: 41.8781,
        destLongitude: -87.6298,
        radius: 75
      }),
    });

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