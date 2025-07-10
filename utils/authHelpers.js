// utils/authHelpers.js
import { supabase } from "./supabaseClient";

export async function getUserWithRole() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { user: null, role: null };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    user,
    role: profile?.role || null,
    error: userError || profileError,
  };
}
