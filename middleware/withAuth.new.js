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
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
      let mounted = true;
      
      const verifyAuth = async () => {
        try {
          const { user, profile } = await getUserAndProfile();
          
          // Only proceed if component is still mounted
          if (!mounted) return;

          if (!user) {
            console.log('No user found, redirecting to login');
            router.replace('/login');
            return;
          }

          if (!profile?.active || profile?.status !== 'approved') {
            console.log('Auth redirect: No approved active user/profile');
            if (profile?.status === 'pending') {
              router.replace('/pending-approval');
            } else {
              router.replace('/login');
            }
            return;
          }

          // Strict role checking
          if (options.requiredRole) {
            if (!profile.role) {
              console.log('No role found, redirecting to unauthorized');
              router.replace('/unauthorized');
              return;
            }

            if (profile.role !== options.requiredRole) {
              console.log(`Role ${profile.role} does not match required ${options.requiredRole}`);
              router.replace('/unauthorized');
              return;
            }
          }

          // If we get here, user is authorized
          setUserProfile({ user, profile });
          setAuthorized(true);
          
        } catch (error) {
          console.error('Auth verification error:', error);
          
          // Retry up to 3 times if we get an error
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            setTimeout(verifyAuth, 1000); // Wait 1 second before retry
            return;
          }
          
          router.replace('/login');
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

      verifyAuth();

      return () => {
        mounted = false;
      };
    }, [router, retryCount]);

    if (loading) {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-lg">Verifying access...</p>
            {retryCount > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Retrying... ({retryCount}/3)
              </p>
            )}
          </div>
        </div>
      );
    }

    // Pass user profile data to the protected component
    return authorized ? <Component {...props} userProfile={userProfile} /> : null;
  };
}
