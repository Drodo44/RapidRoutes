// pages/dashboard.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Image from "next/image";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!user || error) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .eq("active", true)
        .single();

      if (!profile || profileError) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkSessionAndProfile();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p className="text-blue-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 bg-gray-900 shadow-lg">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="RapidRoutes Logo"
            width={40}
            height={40}
            priority
          />
          <span className="text-2xl font-bold tracking-tight">
            RapidRoutes
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-xl text-white font-semibold"
        >
          Logout
        </button>
      </header>

      <section className="flex-1 p-8">
        <h2 className="text-3xl font-bold mb-6">Welcome back!</h2>
        {/* Replace below with actual dashboard logic */}
        <p className="text-gray-300">User ID: {user.id}</p>
        <p className="text-gray-400">Email: {user.email}</p>
      </section>
    </main>
  );
}
