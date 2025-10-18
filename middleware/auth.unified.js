// middleware/auth.unified.js
import { getBrowserSupabase, getServerSupabase } from '../lib/supabaseClient.js';
import { adminSupabase } from '../utils/supabaseAdminClient.js';

/**
 * Unified session handler for auth validation and role checking
 */
async function validateSession(options = {}, authToken = null) {
  try {
    let session, user;
    
    // Server-side: Use provided auth token (from Authorization header)
    if (authToken) {
      // Use server Supabase client for token validation
      const tokenClient = getServerSupabase();
      
      const { data: { user: tokenUser }, error: tokenError } = await tokenClient.auth.getUser();
      
      if (tokenError || !tokenUser) {
        return { error: 'Invalid authentication token' };
      }
      
      user = tokenUser;
      session = { user: tokenUser };
    } 
    // Client-side: Use session from browser
    else {
      const { data: { session: clientSession }, error: authError } = await supabase.auth.getSession();

      if (authError || !clientSession?.user) {
        return { error: 'Authentication required' };
      }
      
      session = clientSession;
      user = clientSession.user;
    }

    // Get user profile with role information using adminSupabase for server-side reliability
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.active || profile.status !== 'approved') {
      return { error: 'User profile not found or inactive' };
    }

    // Check role if required
    if (options.requiredRole && profile.role !== options.requiredRole) {
      return { error: `${options.requiredRole} access required` };
    }

    return {
      user: user,
      profile,
      session
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { error: 'Authentication validation failed' };
  }
}

/**
 * API route middleware to validate auth and optionally check role
 * ENTERPRISE-LEVEL: Supports Bearer token authentication
 */
export async function validateApiAuth(req, res, options = {}) {
  // Test bypass for API validation (ONLY FOR TESTING)
  if (req.headers['x-test-auth-bypass'] === 'true' && process.env.NODE_ENV !== 'production') {
    console.log('⚠️ USING TEST AUTH BYPASS - Development only');
    return {
      user: { id: 'test-user-id' },
      profile: { role: 'Admin', active: true, status: 'approved' }
    };
  }
  
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization;
  const authToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!authToken) {
    res.status(401).json({ error: 'No auth token provided' });
    return null;
  }
  
  const result = await validateSession(options, authToken);
  
  if (result.error) {
    res.status(result.error === 'Authentication required' ? 401 : 403)
      .json({ error: result.error });
    return null;
  }

  return result;
}

/**
 * Page middleware for server-side auth validation
 */
export async function authenticatePage(context, options = {}) {
  const result = await validateSession(options);

  if (result.error) {
    return {
      redirect: {
        destination: result.error === 'Authentication required' ? '/login' : '/unauthorized',
        permanent: false
      }
    };
  }

  return {
    props: {
      user: result.user,
      profile: result.profile
    }
  };
}

/**
 * HOC for client-side auth validation
 */
export function withAuth(Component, options = {}) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
      const verifyAuth = async () => {
        try {
          const result = await validateSession(options);
          if (result.error) {
            router.replace(result.error === 'Authentication required' ? '/login' : '/unauthorized');
            return;
          }
          setUser(result);
          setAuthorized(true);
        } catch (error) {
          console.error('Auth verification error:', error);
          router.replace('/login');
        } finally {
          setLoading(false);
        }
      };

      verifyAuth();
    }, [router]);

    if (loading) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Verifying access...</p>
          </div>
        </div>
      );
    }

    return authorized ? <Component {...props} user={user} /> : null;
  };
}

/**
 * Function to get current user and profile for optional checks
 */
export async function getCurrentUser() {
  const result = await validateSession();
  return result.error ? null : result;
}
