// pages/api/rr-number.js
// API endpoint for RR number generation

import { getNextRRNumber } from '../../lib/rrNumberGenerator.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rrNumber = await getNextRRNumber();
    
    res.status(200).json({
      success: true,
      rrNumber: rrNumber
    });

  } catch (error) {
    console.error('❌ RR Number API error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate RR number',
      success: false
    });
  }
}