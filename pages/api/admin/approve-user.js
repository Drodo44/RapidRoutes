import { adminSupabase } from '../../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, action } = req.body;

  if (!userId || !action || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    const { data: adminCheck, error: adminError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (adminError || !adminCheck || adminCheck.role !== 'Admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updates = {
      status: action === 'approve' ? 'approved' : 'rejected',
      active: action === 'approve',
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ 
      message: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error in approve-user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
