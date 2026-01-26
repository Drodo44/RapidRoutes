// middleware/apiAuth.js
import supabase from '../utils/supabaseClient';

export default async function apiAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile || profile.status !== 'approved') {
      return res.status(401).json({ error: 'Profile not approved' });
    }

    // Add auth context to request
    req.auth = { user, profile };
    
    return next();
  } catch (error) {
    console.error('API Auth error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
