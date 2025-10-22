// pages/api/auth/profile.js
// User profile API endpoint with proper singleton pattern
import { getServerSupabase } from '../../../lib/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getServerSupabase();
    
    // Get the user's session from the request
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Profile API] No auth token provided');
      return res.status(401).json({ error: 'No auth token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT token and get user info using server-side client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError) {
      console.error('[Profile API] Auth error:', authError.message);
      return res.status(401).json({ error: 'Invalid token', details: authError.message });
    }
    
    if (!user) {
      console.error('[Profile API] No user found for token');
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('[Profile API] User authenticated:', user.id);

    // Use server supabase (with service role) to fetch profile (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // If profile doesn't exist, create a basic one
      if (profileError.code === 'PGRST116') {
        console.log('[Profile API] Profile not found, creating basic profile for user:', user.id);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'broker',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('[Profile API] Failed to create profile:', createError);
          return res.status(500).json({ error: 'Failed to create profile', details: createError.message });
        }
        
        return res.status(200).json({ profile: newProfile });
      }
      
      console.error('[Profile API] Profile fetch error:', profileError);
      return res.status(500).json({ error: 'Failed to fetch profile', details: profileError.message });
    }

    console.log('[Profile API] Profile fetched successfully');
    return res.status(200).json({ profile });
    
  } catch (error) {
    console.error('[Profile API] Unexpected error:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      hint: 'Check server logs for full stack trace'
    });
  }
}
