// pages/api/promotions/approve.js
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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
      return res.status(403).json({ error: 'Only admins can approve promotion requests' });
    }

    const { requestId, action, rejectionReason } = req.body;

    if (!requestId || !action || !['approve', 'deny'].includes(action)) {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

    // Get the promotion request
    const { data: request } = await supabaseAdmin
      .from('promotion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) {
      return res.status(404).json({ error: 'Promotion request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    if (action === 'approve') {
      // Promote user to Broker
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          role: 'Broker',
          team_role: 'owner',
          organization_id: request.user_id, // Their user ID becomes their org ID
          team_name: request.requested_team_name
        })
        .eq('id', request.user_id);

      if (updateProfileError) {
        console.error('Error promoting user:', updateProfileError);
        return res.status(500).json({ error: 'Failed to promote user' });
      }

      // Update request status
      await supabaseAdmin
        .from('promotion_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      return res.status(200).json({
        success: true,
        message: `User promoted to Broker with team: ${request.requested_team_name}`
      });
    } else {
      // Deny request
      await supabaseAdmin
        .from('promotion_requests')
        .update({
          status: 'denied',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || null
        })
        .eq('id', requestId);

      return res.status(200).json({
        success: true,
        message: 'Promotion request denied'
      });
    }
  } catch (error) {
    console.error('Unexpected error in approve promotion:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
