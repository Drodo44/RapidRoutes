// pages/api/email-template/available-loads.js
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Fetch "actual" lanes that are currently available
    // Based on recap.js, 'current' is the primary status for active, usable lanes.
    const { data, error } = await supabase
      .from('lanes')
      .select('origin_city, origin_state, destination_city, destination_state, equipment_code, commodity, comment, length_ft')
      .in('lane_status', ['current', 'active']);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Error fetching available loads: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ lanes: [] });
    }

    // The data is already in the format of "actual" lanes, so no complex transformation is needed.
    // We just return the list of lanes.
    res.status(200).json({ lanes: data });

  } catch (error) {
    console.error('Server-side error:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
