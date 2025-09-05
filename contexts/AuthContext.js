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
          console.log('AuthContext: Fetching initial profile...');
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();
          
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
