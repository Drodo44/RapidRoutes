// middleware/withAuth.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserAndProfile } from '../utils/getUserProfile';

/**
 * HOC to wrap pages requiring authentication
 * @param {React.Component} Component - The page component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.requiredRole - Optional role requirement (e.g., 'Admin')
 * @returns {React.Component} - Protected component
 */
export default function withAuth(Component, options = {}) {
  return function ProtectedPage(props) {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      let mounted = true;

      async function verifyAuth() {
        try {
          const { user, profile } = await getUserAndProfile();

          if (!mounted) return;

          // Check user status and activity
          if (!user || !profile?.active || profile?.status !== 'approved') {
            console.log('Auth redirect: No approved active user/profile');
            
            // If pending approval, show waiting screen
            if (profile?.status === 'pending') {
              await router.replace('/pending-approval');
              return;
            }
            
            // Otherwise redirect to login
            await router.replace('/login');
            return;
          }

          // Role check if required
          if (options.requiredRole && profile.role !== options.requiredRole) {
            console.log(`Auth redirect: Role mismatch - Required: ${options.requiredRole}, Has: ${profile.role}`);
            await router.replace('/unauthorized');
            return;
          }

          // Success - set profile and continue
          setUserProfile({ user, profile });
          setLoading(false);

        } catch (err) {
          console.error('Auth error:', err);
          setError(err.message);
          setLoading(false);
        }
      }

      verifyAuth();

      // Watch for path changes
      const lastPath = router.asPath;
      if (mounted && lastPath !== '/login' && lastPath !== '/unauthorized') {
        verifyAuth();
      }

      // Cleanup
      return () => {
        mounted = false;
      };
    }, [router.asPath]);

    // Loading state
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

    // Error state
    if (error) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <p className="text-lg text-red-400">Authentication Error</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
            <button 
              onClick={() => router.replace('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    // No profile = not authorized
    if (!userProfile) {
      return null;
    }

    // All good - render the protected component
    return <Component {...props} userProfile={userProfile} />;
  };
}
