// utils/getUserProfile.js
import { supabase } from "./supabaseClient";

export async function getUserAndProfile() {
  try {
    // First check for active session
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('Session check:', sessionData?.session ? 'Active' : 'None');
    
    if (!sessionData?.session) {
      console.log('No active session');
      return { user: null, profile: null };
    }
    
    // Then get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Auth user error:', userError);
      return { user: null, profile: null };
    }
    
    if (!user) {
      console.log('No authenticated user found');
      return { user: null, profile: null };
    }
    
    // Finally get profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return { user, profile: null };
    }

    if (!profile) {
      console.log('No profile found for user:', user.id);
      return { user, profile: null };
    }

    console.log('Profile status:', {
      id: profile.id,
      status: profile.status,
      role: profile.role
    });

    return { user, profile };
  } catch (error) {
    console.error('getUserProfile error:', error);
    return { user: null, profile: null };
  }
}
