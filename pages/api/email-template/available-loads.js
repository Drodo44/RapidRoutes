// pages/api/email-template/available-loads.js
import { adminSupabase } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fetch "actual" lanes that are currently available for THIS user
    // We join with equipment_codes to get the full label
    const { data, error } = await adminSupabase
      .from('lanes')
      .select(`
        origin_city, 
        origin_state, 
        destination_city, 
        destination_state, 
        equipment_code, 
        commodity, 
        comment, 
        length_ft,
        equipment_codes (
          label
        )
      `)
      .eq('user_id', user.id) // Filter by logged-in user
      .in('lane_status', ['current', 'active']);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Error fetching available loads: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return res.status(200).json({ lanes: [] });
    }

    // Flatten the structure so the frontend receives a simple object
    const flattenedLanes = data.map(lane => ({
      ...lane,
      equipment_label: lane.equipment_codes?.label || lane.equipment_code // Fallback to code if label missing
    }));

    res.status(200).json({ lanes: flattenedLanes });

  } catch (error) {
    console.error('Server-side error:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
