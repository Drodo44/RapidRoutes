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

    // Get initial session
    console.log('AuthContext: Initializing...');
    
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      console.log('AuthContext: Initial session check:', {
        hasSession: !!initialSession,
        userId: initialSession?.user?.id
      });
      
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        // Get initial profile
        console.log('AuthContext: Fetching initial profile...');
        
        supabase
          .from('profiles')
          .select('*')
          .eq('id', initialSession.user.id)
          .single()
          .then(({ data: profile, error }) => {
            if (!mounted) return;
            
            if (error) {
              console.error('AuthContext: Profile fetch error:', error);
              setProfile(null);
            } else {
              console.log('AuthContext: Profile loaded:', {
                id: profile?.id,
                status: profile?.status,
                role: profile?.role
              });
              setProfile(profile);
            }
            
            setLoading(false);
          });
      } else {
        console.log('AuthContext: No initial session, setting not loading');
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      
      console.log('Auth state change:', event, newSession?.user?.id);
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      try {
        // Clear profile on signOut
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
          return;
        }
        
        // Update profile on auth changes
        if (newSession?.user) {
          const { data: newProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newSession.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            setProfile(null);
          } else {
            console.log('Profile loaded:', newProfile?.status, newProfile?.role);
            setProfile(newProfile);
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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
