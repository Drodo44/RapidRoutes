/**
 * Environment Variables Check API
 * Verifies presence of critical Supabase and API keys
 * 
 * GET /api/env-check
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // List of critical environment variables to check
    const criticalEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_HERE_API_KEY',
      'NEXT_PUBLIC_FORCE_DIAGNOSTIC_ZIPS'
    ];

    // Check each variable and report status
    const envStatus = {};
    criticalEnvVars.forEach(key => {
      envStatus[key] = process.env[key] ? 'present' : 'missing';
    });

    // Return structured response
    res.status(200).json({
      ok: true,
      timestamp: new Date().toISOString(),
      env: envStatus
    });

  } catch (error) {
    console.error('Error checking environment variables:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to check environment variables',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
