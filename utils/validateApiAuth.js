// utils/validateApiAuth.js
import supabase from './supabaseClient';

/**
 * Middleware to validate API authentication and optionally check roles
 * @param {Object} req - Next.js request object
 * @param {Object} res - Next.js response object
 * @param {Object} options - Validation options
 * @param {string} options.requiredRole - Optional role requirement
 * @returns {Object|null} - Returns { user, profile } if authorized, null if redirected
 */
export async function validateApiAuth(req, res, options = {}) {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      res.status(401).json({ error: 'Authentication required' });
      return null;
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.active) {
      res.status(401).json({ error: 'User profile not found or inactive' });
      return null;
    }

    // Check role if required
    if (options.requiredRole && profile.role !== options.requiredRole) {
      res.status(403).json({ error: `${options.requiredRole} access required` });
      return null;
    }

    // Return authorized user and profile data
    return { user: session.user, profile };
  } catch (error) {
    console.error('API auth validation error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return null;
  }
}

/**
 * Get current user and profile without rejection
 * Use this for optional auth checks
 */
export async function getCurrentUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return profile?.active ? { user: session.user, profile } : null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
