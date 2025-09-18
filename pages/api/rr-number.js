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
    // Fallback: generate timestamp-based RR to avoid blocking UI
    const ts = Date.now().toString().slice(-5);
    const rrFallback = `RR${ts.padStart(5, '0')}`;
    res.status(200).json({
      success: true,
      rrNumber: rrFallback,
      fallback: true,
      error: error?.message || 'Using fallback RR number'
    });
  }
}