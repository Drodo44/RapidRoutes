// pages/api/debug/test.js
// Simple test endpoint to check if Supabase is working

import { adminSupabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test basic connection
    const { data, error } = await adminSupabase
      .from('cities')
      .select('city, state_or_province')
      .limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: error.message,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Database connection working',
      testCity: data?.[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('API test error:', err);
    return res.status(500).json({ 
      error: 'Test failed', 
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5)
    });
  }
}
