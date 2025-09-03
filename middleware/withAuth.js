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

    useEffect(() => {
      const verifyAuth = async () => {
        try {
          const { user, profile } = await getUserAndProfile();

          if (!user || !profile?.active) {
            router.push('/login');
            return;
          }

          if (options.requiredRole && profile.role !== options.requiredRole) {
            router.push('/unauthorized');
            return;
          }

          setAuthorized(true);
          setUserProfile({ user, profile });
        } catch (error) {
          console.error('Auth verification error:', error);
          router.push('/login');
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
            <p>Verifying access...</p>
          </div>
        </div>
      );
    }

    // Pass user profile data to the protected component
    return authorized ? <Component {...props} userProfile={userProfile} /> : null;
  };
}
