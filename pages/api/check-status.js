// pages/api/check-status.js
import supabase from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('status, active')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    
    return res.status(200).json(profile);
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}
