// middleware/authMiddleware.js
import supabase from '../utils/supabaseClient';

/**
 * Authorization middleware for API routes
 * 
 * @param {Function} handler - The API route handler function
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @param {string[]} options.requiredRoles - Required roles (if any)
 * @returns {Function} - Enhanced handler with authorization checks
 */
export function withAuth(handler, options = { requireAuth: true, requiredRoles: [] }) {
  return async (req, res) => {
    // Skip auth check if not required
    if (!options.requireAuth) {
      return handler(req, res);
    }

    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid authorization token' 
      });
    }

    // Extract token
    const token = authHeader.substring(7);
    
    try {
      // Verify the token
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.error('Auth error:', error?.message || 'Invalid token');
        return res.status(401).json({ 
          error: 'Unauthorized', 
          message: 'Invalid or expired authorization token'
        });
      }
      
      // Check required roles if specified
      if (options.requiredRoles && options.requiredRoles.length > 0) {
        // Get user roles from Supabase
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
          
        if (rolesError) {
          console.error('Error fetching user roles:', rolesError.message);
          return res.status(500).json({ 
            error: 'Internal Server Error', 
            message: 'Failed to verify user permissions' 
          });
        }
        
        // Check if user has required role
        const hasRequiredRole = userRoles?.some(ur => 
          options.requiredRoles.includes(ur.role)
        );
        
        if (!hasRequiredRole) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Insufficient permissions' 
          });
        }
      }
      
      // Add user to request for downstream handlers
      req.user = user;
      
      // Proceed with the original handler
      return handler(req, res);
      
    } catch (error) {
      console.error('Authentication error:', error.message);
      return res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Authentication check failed'
      });
    }
  };
}