import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Profile() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [debug, setDebug] = useState("");

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      setSession(data?.session || null);
      setDebug("Session: " + JSON.stringify(data?.session));
      setLoading(false);
    };
    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setDebug("Session (authStateChange): " + JSON.stringify(session));
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const getProfile = async () => {
      if (session?.user) {
        const email = session.user.email;
        setDebug(d => d + "\nUser Email: " + email);
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("email", email)
          .single();
        setProfile(data || null);
        setDebug(d => d + "\nProfile: " + JSON.stringify(data));
      }
    };
    if (session?.user) getProfile();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <p className="text-cyan-400">Loading profile...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Profile</h1>
        <div className="bg-gray-900 p-8 rounded-xl shadow-xl text-red-400">
          You must be logged in to see your profile.
        </div>
        <pre className="text-xs text-gray-400 mt-6">{debug}</pre>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Profile</h1>
        <div className="bg-gray-900 p-8 rounded-xl shadow-xl text-yellow-400">
          Profile not found.<br />If you just registered, your account may be pending admin approval.
        </div>
        <pre className="text-xs text-gray-400 mt-6">{debug}</pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Profile</h1>
      <div className="bg-gray-900 p-8 rounded-xl shadow-xl w-full max-w-lg">
        <p className="mb-2"><span className="font-semibold text-cyan-300">Name:</span> {profile.name || "(none)"}</p>
        <p className="mb-2"><span className="font-semibold text-cyan-300">Email:</span> {profile.email}</p>
        <p className="mb-2"><span className="font-semibold text-cyan-300">Role:</span> {profile.role}</p>
        <p className="mb-2"><span className="font-semibold text-cyan-300">Created:</span> {profile.created_at ? new Date(profile.created_at).toLocaleString() : "(unknown)"}</p>
        <pre className="text-xs text-gray-400 mt-6">{debug}</pre>
      </div>
    </div>
  );
}
