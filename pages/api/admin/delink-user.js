// pages/api/admin/delink-user.js
import { validateApiAuth } from '../../../middleware/auth.unified';
import supabaseAdmin from '../../../lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateApiAuth(req, res);
  if (!auth || auth.profile?.role !== 'Admin') {
    return res.status(401).json({ error: 'Unauthorized: Admin access required' });
  }

  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Generate a new organization_id for this user
    const newOrgId = crypto.randomUUID();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ organization_id: newOrgId })
      .eq('id', userId)
      .select();

    if (error) throw error;

    return res.status(200).json({ message: 'User de-linked successfully', profile: data[0] });
  } catch (error) {
    console.error('De-link error:', error);
    return res.status(500).json({ error: 'Failed to de-link user', details: error.message });
  }
}
