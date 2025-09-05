// middleware/sessionHandler.js
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export async function sessionHandler(req, res, next) {
  try {
    // Create authenticated Supabase client
    const supabase = createServerSupabaseClient({ req, res });
    
    // Check if we have a session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) throw error;

    if (!session) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'Please sign in to continue'
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile || !profile.active || profile.status !== 'approved') {
      return res.status(403).json({
        error: 'Account not active',
        message: 'Your account is not yet approved'
      });
    }

    // Add user and profile to request
    req.user = session.user;
    req.profile = profile;
    req.supabase = supabase;

    next();
  } catch (error) {
    next(error);
  }
}
