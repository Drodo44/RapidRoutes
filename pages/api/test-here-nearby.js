// Direct test of HERE.com nearby cities generation
import { generateAlternativeCitiesWithHERE } from '../../lib/hereVerificationService.js';
import { adminSupabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  try {
    // Test with Opelika, AL (coordinates: 32.6612, -85.3769)
    console.log('🧪 Testing HERE.com nearby cities for Opelika, AL...');
    
    const nearbyCities = await generateAlternativeCitiesWithHERE(
      32.6612, -85.3769, // Opelika, AL coordinates  
      75, // 75 mile radius
      20  // Get 20 cities
    );
    
    console.log('HERE.com nearby cities result:', JSON.stringify(nearbyCities, null, 2));
    
    res.status(200).json({
      success: true,
      testLocation: 'Opelika, AL (32.6612, -85.3769)',
      radius: '75 miles',
      nearbyCitiesFound: nearbyCities.length,
      cities: nearbyCities
    });
    
  } catch (error) {
    console.error('HERE.com nearby cities test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
