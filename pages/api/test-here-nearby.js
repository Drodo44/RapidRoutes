// Direct test of HERE.com API key and basic functionality
export default async function handler(req, res) {
  try {
    const HERE_API_KEY = process.env.HERE_API_KEY;
    
    if (!HERE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'HERE_API_KEY not configured',
        hereApiKey: HERE_API_KEY ? 'SET' : 'NOT SET'
      });
    }
    
    console.log('🧪 Testing basic HERE.com API access...');
    
    // Simple test with Opelika, AL coordinates
    const lat = 32.6612;
    const lng = -85.3769; 
    const radiusMiles = 75;
    const radiusMeters = radiusMiles * 1609.34;
    
    const url = `https://browse.search.hereapi.com/v1/browse?at=${lat},${lng}&categories=city&in=circle:${lat},${lng};r=${radiusMeters}&limit=20&apiKey=${HERE_API_KEY}`;
    
    console.log('HERE API URL:', url.replace(HERE_API_KEY, 'HIDDEN'));
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('HERE API Response:', JSON.stringify(data, null, 2));
    
    res.status(200).json({
      success: true,
      hereApiConfigured: true,
      testLocation: 'Opelika, AL (32.6612, -85.3769)',
      radius: '75 miles',
      responseStatus: response.status,
      citiesFound: data.items?.length || 0,
      cities: data.items?.slice(0, 5) || [], // First 5 cities only
      rawResponse: data
    });
    
  } catch (error) {
    console.error('HERE.com API test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
