// middleware/withAuth.js
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

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
    const { user, profile, loading, isAuthenticated, isAdmin } = useAuth();

    useEffect(() => {
      if (loading) return;

      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login');
        router.replace('/login');
        return;
      }

      if (options.requiredRole === 'Admin' && !isAdmin) {
        console.log('User not admin, redirecting to unauthorized');
        router.replace('/unauthorized');
        return;
      }
    }, [loading, isAuthenticated, isAdmin, router]);

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

    // Only render if authenticated and role matches
    const authorized = isAuthenticated && (!options.requiredRole || (options.requiredRole === 'Admin' && isAdmin));
    
    return authorized ? (
      <Component {...props} userProfile={{ user, profile }} />
    ) : null;
  };
}
