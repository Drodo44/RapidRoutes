export default function handler(req, res) {
  try {
    console.log('🚨 SIMPLE TEST API CALLED');
    console.log('Query params:', req.query);
    
    return res.status(200).json({ 
      message: 'API is working', 
      query: req.query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simple test API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
