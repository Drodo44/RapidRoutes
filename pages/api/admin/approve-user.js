// pages/api/admin/approve-user.js
import { adminSupabase } from '../../../utils/adminSupabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;

  if (!userId || !action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Verify the requester is an admin
    const requesterId = req.headers['x-user-id'];
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: adminCheck, error: adminError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (adminError || adminCheck?.role !== 'Admin') {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // Get user email first
    const { data: userData, error: userError } = await adminSupabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Update the user's profile
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ 
        status: action === 'approve' ? 'approved' : 'rejected',
        active: action === 'approve'
      })
      .eq('id', userId);

    // Send appropriate email
    if (action === 'approve') {
      await sendApprovalEmail(userData.email);
    } else {
      await sendRejectionEmail(userData.email);

    if (updateError) throw updateError;

    return res.status(200).json({ 
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error in approve-user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
