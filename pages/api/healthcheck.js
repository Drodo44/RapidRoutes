// pages/api/healthcheck.js
import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      status: 'error',
      message: 'Method Not Allowed' 
    });
  }

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('cities')
      .select('count(*)')
      .single();

    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }

    // Get app version from package.json
    const appVersion = process.env.npm_package_version || 'unknown';
    
    // Return health status and basic metrics
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: appVersion,
      environment: process.env.NODE_ENV || 'development',
      database: {
        connected: true,
        recordCount: data?.count || 0
      },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Health check failed:', error.message);
    
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    });
  }
}