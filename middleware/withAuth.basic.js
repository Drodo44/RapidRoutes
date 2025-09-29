// middleware/withAuth.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function withAuth(Component, options = {}) {
  return function ProtectedPage(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
      // Get current user's session and profile
      async function checkUser() {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            router.replace('/login');
            return;
          }

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError || !profile || profile.status !== 'approved') {
            router.replace('/login');
            return;
          }

          if (options.requiredRole && profile.role !== options.requiredRole) {
            router.replace('/unauthorized');
            return;
          }

          setUser({ ...session.user, profile });
          setLoading(false);
          
        } catch (error) {
          console.error('Auth check error:', error);
          router.replace('/login');
        }
      }

      checkUser();
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

    return <Component {...props} user={user} />;
  };
}
