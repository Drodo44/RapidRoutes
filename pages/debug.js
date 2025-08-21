// pages/debug.js
// Debug page to check auth status and environment

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/router';

export default function DebugPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [env, setEnv] = useState({});

  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        setSessionData(session);
        setAuthState(session ? 'authenticated' : 'not authenticated');
        
        if (error) {
          console.error('Auth error:', error);
          setAuthState(`error: ${error.message}`);
        }
      } catch (err) {
        setAuthState(`exception: ${err.message}`);
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

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔍 RapidRoutes Debug</h1>
        
        {/* Auth Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <div>Status: <span className="text-blue-400">{authState || 'checking...'}</span></div>
            <div>Session exists: <span className="text-blue-400">{sessionData ? 'yes' : 'no'}</span></div>
            {sessionData && (
              <div className="mt-4 p-4 bg-gray-700 rounded">
                <h3 className="font-medium mb-2">Session Data:</h3>
                <pre className="text-xs overflow-auto">{JSON.stringify(sessionData, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Environment */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <div className="space-y-2">
            <div>Supabase URL: <span className="text-blue-400">{env.supabaseUrl}</span></div>
            <div>Has Anon Key: <span className="text-blue-400">{env.hasAnonKey ? 'yes' : 'no'}</span></div>
            <div>Node Env: <span className="text-blue-400">{env.nodeEnv}</span></div>
            <div>Current Path: <span className="text-blue-400">{env.pathname}</span></div>
            <div>As Path: <span className="text-blue-400">{env.asPath}</span></div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-y-4">
            <button 
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded mr-4"
            >
              Go to Login
            </button>
            <button 
              onClick={() => router.push('/lanes')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded mr-4"
            >
              Go to Lanes
            </button>
            <button 
              onClick={() => router.push('/crawl-preview?origin=Atlanta,GA&dest=Memphis,TN&equip=V')}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded mr-4"
            >
              Test Preview Page
            </button>
            <button 
              onClick={() => window.open('/api/debugCrawl?origin=Atlanta,GA&dest=Memphis,TN&equip=V', '_blank')}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded"
            >
              Test Raw API
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
