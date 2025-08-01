// utils/getUserProfile.js
import { supabase } from "./supabaseClient";

export async function getUserAndProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { user: null, profile: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return { user, profile: null };

  return { user, profile };
}
