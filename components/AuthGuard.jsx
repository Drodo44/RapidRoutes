// components/AuthGuard.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getUserAndProfile } from '../utils/getUserProfile';

export default function AuthGuard({ children, requiredRole = null }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const { user, profile } = await getUserAndProfile();

        if (!user || !profile?.active) {
          router.push('/login');
          return;
        }

        if (requiredRole && profile.role !== requiredRole) {
          router.push('/unauthorized');
          return;
        }

        setAuthorized(true);
      } catch (error) {
        console.error('Auth guard error:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router, requiredRole]);

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

  return authorized ? children : null;
}
