// pages/api/check-env.js
// A temporary endpoint to check environment variables

export default async function handler(req, res) {
  // Only allow GET requests to this endpoint
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only GET requests are supported',
      success: false
    });
  }

  try {
    // Return environment variables (safe ones only)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
      ALLOW_TEST_MODE_VALUE: process.env.ALLOW_TEST_MODE === 'true',
      timestamp: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      environment: envInfo
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
      success: false
    });
  }
}