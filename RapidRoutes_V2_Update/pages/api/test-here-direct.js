// pages/api/test-here-direct.js
import { verifyCityWithHERE } from '../../lib/hereVerificationService.js';

export default async function handler(req, res) {
  try {
    console.log('🔍 Testing HERE.com directly...');
    
    // Test New York
    const nyResult = await verifyCityWithHERE('New York', 'NY', '');
    console.log('NY Result:', JSON.stringify(nyResult, null, 2));
    
    // Test Los Angeles  
    const laResult = await verifyCityWithHERE('Los Angeles', 'CA', '');
    console.log('LA Result:', JSON.stringify(laResult, null, 2));
    
    res.status(200).json({
      success: true,
      tests: {
        newYork: {
          verified: nyResult.verified,
          hasData: !!nyResult.data,
          data: nyResult.data
        },
        losAngeles: {
          verified: laResult.verified,
          hasData: !!laResult.data,
          data: laResult.data
        }
      }
    });
    
  } catch (error) {
    console.error('HERE test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
}
