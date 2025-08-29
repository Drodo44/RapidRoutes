// Test HERE.com API directly
import { verifyCityWithHERE } from '../../lib/hereVerificationService.js';

export default async function handler(req, res) {
  try {
    console.log('🧪 Testing HERE.com API for McDavid, FL...');
    
    const result = await verifyCityWithHERE('McDavid', 'FL', '');
    
    console.log('HERE.com result:', JSON.stringify(result, null, 2));
    
    res.status(200).json({
      success: true,
      testCity: 'McDavid, FL',
      hereResult: result
    });
    
  } catch (error) {
    console.error('HERE.com test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}
