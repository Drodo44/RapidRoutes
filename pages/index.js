// pages/index.js - Analytics Dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';
import Header from '../components/Header';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

export default function IndexPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to login if not authenticated
          router.replace('/login');
        } else {
          setAuthenticated(true);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 bg-gradient-radial from-gray-800 to-gray-900">
        <div className="text-center">
          <img 
            src="/logo.png" 
            alt="RapidRoutes" 
            className="h-16 mb-6 filter drop-shadow-lg animate-pulse" 
          />
          <div className="flex items-center gap-3 text-lg font-semibold text-gray-300">
            <svg 
              className="animate-spin h-5 w-5 text-blue-500" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading RapidRoutes Analytics...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated state should redirect automatically
  
  // Authenticated - show analytics dashboard
  return (
    <div className="bg-gray-900 text-gray-100 min-h-screen">
      <Header />
      
      <main className="container mx-auto p-4 md:p-6">
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
