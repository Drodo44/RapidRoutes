// deployment-verification.js
// Add this to your project's /pages/api directory

export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Next.js API routes are working correctly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown'
  });
}
