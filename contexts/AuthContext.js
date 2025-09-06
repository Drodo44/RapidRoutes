// contexts/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Get initial session
        console.log('AuthContext: Initializing...');
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('AuthContext: Initial session check:', {
          hasSession: !!initialSession,
          userId: initialSession?.user?.id
        });
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          // Get initial profile
          console.log('AuthContext: Fetching initial profile for user:', initialSession.user.id);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();
          
          if (!mounted) return;
          
          if (error) {
            console.error('AuthContext: Profile fetch error:', error.message, error.code);
            setProfile(null);
          } else {
            console.log('AuthContext: Profile loaded:', {
              id: profile?.id,
              status: profile?.status,
              role: profile?.role,
              email: profile?.email
            });
            setProfile(profile);
          }
        } else {
          console.log('AuthContext: No initial session');
        }
      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
        if (mounted) {
          setProfile(null);
          setUser(null);
          setSession(null);
        }
      } finally {
        if (mounted) {
          console.log('AuthContext: Setting loading to false');
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, newSession?.user?.id);
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      // Clear profile on signOut
      if (event === 'SIGNED_OUT') {
        console.log('AuthContext: User signed out');
        setProfile(null);
        setLoading(false);
        return;
      }
      
      // Update profile on auth changes
      if (newSession?.user) {
        console.log('AuthContext: Fetching profile for auth state change, user ID:', newSession.user.id);
        
        try {
          const { data: newProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          
          console.log('AuthContext: Profile query result:', { 
            hasData: !!newProfile, 
            hasError: !!error,
            errorMessage: error?.message,
            errorCode: error?.code
          });
          
          if (error) {
            console.error('AuthContext: Auth change profile error:', error.message, error.code);
            setProfile(null);
          } else {
            console.log('AuthContext: Profile loaded from auth change:', {
              id: newProfile?.id,
              status: newProfile?.status, 
              role: newProfile?.role,
              email: newProfile?.email
            });
            setProfile(newProfile);
          }
        } catch (fetchError) {
          console.error('AuthContext: Profile fetch exception:', fetchError);
          setProfile(null);
        }
      } else {
        console.log('AuthContext: No user in auth change session');
        setProfile(null);
      }
      
      console.log('AuthContext: Auth change complete, setting loading to false');
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    loading,
    isAuthenticated: !!session && !!profile && profile.status === 'approved',
    isAdmin: profile?.role === 'Admin',
    isBroker: profile?.role === 'Broker',
    isSupport: profile?.role === 'Support',
    isApprentice: profile?.role === 'Apprentice',
    // Helper functions for permission checks
    hasAdminAccess: profile?.role === 'Admin',
    hasBrokerAccess: ['Admin', 'Broker'].includes(profile?.role),
    hasSupportAccess: ['Admin', 'Broker', 'Support'].includes(profile?.role),
    hasAnyAccess: ['Admin', 'Broker', 'Support', 'Apprentice'].includes(profile?.role),
  };

  return (
    <AuthContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
