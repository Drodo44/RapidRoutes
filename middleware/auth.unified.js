// middleware/auth.unified.js
import { supabase, adminSupabase } from '../utils/supabaseClient';

/**
 * Unified session handler for auth validation and role checking
 */
async function validateSession(options = {}) {
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return { error: 'Authentication required' };
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile?.active || profile.status !== 'approved') {
      return { error: 'User profile not found or inactive' };
    }

    // Check role if required
    if (options.requiredRole && profile.role !== options.requiredRole) {
      return { error: `${options.requiredRole} access required` };
    }

    return { user: session.user, profile };
  } catch (error) {
    console.error('Session validation error:', error);
    return { error: 'Authentication failed' };
  }
}

/**
 * API route middleware to validate auth and optionally check role
 */
export async function validateApiAuth(req, res, options = {}) {
  const result = await validateSession(options);
  
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
