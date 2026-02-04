// pages/api/email-template/available-loads.js
import { adminSupabase } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import { getUserOrganizationId } from '@/lib/organizationHelper';

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

    // Get user's organization
    const organizationId = await getUserOrganizationId(user.id);

    // Build query
    let query = adminSupabase
      .from('lanes')
      .select(`
        origin_city, 
        origin_state, 
        destination_city, 
        destination_state, 
        equipment_code, 
        commodity, 
        comment, 
        length_ft
      `)
      .in('lane_status', ['current', 'active']) // User requested only ACTIVE lanes
      .order('created_at', { ascending: false });

    // Filter by organization if available, otherwise by user
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data: lanes, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Error fetching available loads: ${error.message}`);
    }

    if (!lanes || lanes.length === 0) {
      return res.status(200).json({ lanes: [] });
    }

    // Fetch equipment codes manually since the foreign key relationship might be missing or named differently
    const { data: equipmentCodes } = await adminSupabase
      .from('equipment_codes')
      .select('code, label');

    // Create a lookup map for equipment codes
    const equipmentMap = (equipmentCodes || []).reduce((acc, item) => {
      acc[item.code] = item.label;
      return acc;
    }, {});

    // Map the labels onto the lanes
    const flattenedLanes = lanes.map(lane => ({
      ...lane,
      equipment_label: equipmentMap[lane.equipment_code] || lane.equipment_code
    }));

    res.status(200).json({ lanes: flattenedLanes });

  } catch (error) {
    console.error('Server-side error:', error);
    res.status(500).json({ error: error.message || 'An internal server error occurred.' });
  }
}
