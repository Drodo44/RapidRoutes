export default function handler(req, res) {
  console.log('🚨 SIMPLE TEST API CALLED');
  console.log('Query params:', req.query);
  return res.status(200).json({ 
    message: 'API is working', 
    query: req.query,
    timestamp: new Date().toISOString()
  });
}
