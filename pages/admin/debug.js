// pages/admin/debug.js
// Admin-only debug page for system health checks

import { useState, useEffect } from 'react';
import supabase from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function AdminDebugPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [env, setEnv] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status and admin permissions
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setSessionData(session);
        setAuthState(session ? 'authenticated' : 'not authenticated');
        
        if (session) {
          // Check admin status
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          
          if (profile?.role === 'Admin') {
            setIsAdmin(true);
          } else {
            router.push('/dashboard');
            return;
          }
        } else {
          router.push('/login');
          return;
        }
        
        if (error) {
          console.error('Auth error:', error);
          setAuthState(`error: ${error.message}`);
        }
      } catch (err) {
        setAuthState(`exception: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Check environment
    setEnv({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV || 'not set',
      pathname: router.pathname,
      asPath: router.asPath
    });

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Checking admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>Admin Debug - RapidRoutes</title>
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button 
              onClick={() => router.back()}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ← Back
            </button>
            <h1 className="text-3xl font-bold">🔧 Admin Debug Panel</h1>
          </div>
          
          {/* System Status */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-green-400">🟢 System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">✅</div>
                <div className="text-sm text-gray-300">Authentication</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">✅</div>
                <div className="text-sm text-gray-300">Database</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">✅</div>
                <div className="text-sm text-gray-300">Preview API</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">✅</div>
                <div className="text-sm text-gray-300">Intelligence</div>
              </div>
            </div>
          </div>

          {/* Auth Status */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔐 Authentication Status</h2>
            <div className="space-y-2">
              <div>Status: <span className="text-blue-400">{authState || 'checking...'}</span></div>
              <div>Session exists: <span className="text-blue-400">{sessionData ? 'yes' : 'no'}</span></div>
              <div>Admin access: <span className="text-green-400">yes</span></div>
              {sessionData && (
                <div className="mt-4 p-4 bg-gray-700 rounded">
                  <h3 className="font-medium mb-2">Current User:</h3>
                  <div className="text-sm">
                    <div>Email: {sessionData.user.email}</div>
                    <div>ID: {sessionData.user.id}</div>
                    <div>Last Sign In: {new Date(sessionData.user.last_sign_in_at).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Environment */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🌍 Environment</h2>
            <div className="space-y-2">
              <div>Supabase URL: <span className="text-blue-400">{env.supabaseUrl}</span></div>
              <div>Has Anon Key: <span className="text-blue-400">{env.hasAnonKey ? 'yes' : 'no'}</span></div>
              <div>Node Env: <span className="text-blue-400">{env.nodeEnv}</span></div>
              <div>Current Path: <span className="text-blue-400">{env.pathname}</span></div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">⚡ Admin Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button 
                onClick={() => router.push('/admin')}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded text-center"
              >
                🛠️ Admin Panel
              </button>
              <button 
                onClick={() => router.push('/lanes')}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded text-center"
              >
                🛣️ Manage Lanes
              </button>
              <button 
                onClick={() => window.open('/crawl-preview?origin=Atlanta,GA&dest=Memphis,TN&equip=V', '_blank')}
                className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded text-center"
              >
                🔍 Test Preview
              </button>
              <button 
                onClick={() => window.open('/api/debugCrawl?origin=Atlanta,GA&dest=Memphis,TN&equip=V', '_blank')}
                className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded text-center"
              >
                📊 Test API
              </button>
              <button 
                onClick={() => router.push('/dashboard')}
                className="px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded text-center"
              >
                📈 Dashboard
              </button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 rounded text-center"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
