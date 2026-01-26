// pages/api/promotions/list.js
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
      req.headers.authorization?.replace('Bearer ', '')
    );

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user is Admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'Admin') {
      return res.status(403).json({ error: 'Only admins can view promotion requests' });
    }

    // Get all pending promotion requests
    const { data: requests, error: fetchError } = await supabaseAdmin
      .from('promotion_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching promotion requests:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch promotion requests' });
    }

    return res.status(200).json({ requests: requests || [] });
  } catch (error) {
    console.error('Unexpected error in list promotions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
