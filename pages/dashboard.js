import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import FloorSpaceChecker from "../components/FloorSpaceChecker";
import HeavyHaulChecker from "../components/HeavyHaulChecker";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");

  useEffect(() => {
    const getUserProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", session.user.id)
          .single();
        setName(profile?.name || "Broker");
      }
    };
    getUserProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 hidden md:block">
          <h2 className="text-xl font-semibold mb-6 text-white">RapidRoutes</h2>
          <nav className="flex flex-col gap-4">
            <a href="/dashboard" className="hover:text-emerald-400">Dashboard</a>
            <a href="/lanes" className="hover:text-emerald-400">Post Lanes</a>
            <a href="/recap" className="hover:text-emerald-400">Recap</a>
            <a href="/profile" className="hover:text-emerald-400">Profile</a>
            <a href="/settings" className="hover:text-emerald-400">Settings</a>
            <a href="/admin" className="hover:text-emerald-400">Admin</a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Welcome back, {name}</h1>
            <p className="text-sm text-gray-400 mt-2 md:mt-0">Where algorithmic intelligence meets AI automation</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-900 p-5 rounded-lg shadow border border-gray-800">
              <h2 className="text-xl font-semibold text-white">Active Postings</h2>
              <p className="text-3xl font-bold text-emerald-400 mt-2">89</p>
            </div>
            <div className="bg-gray-900 p-5 rounded-lg shadow border border-gray-800">
              <h2 className="text-xl font-semibold text-white">Calls Today</h2>
              <p className="text-3xl font-bold text-emerald-400 mt-2">34</p>
            </div>
            <div className="bg-gray-900 p-5 rounded-lg shadow border border-gray-800">
              <h2 className="text-xl font-semibold text-white">RRSI Avg</h2>
              <p className="text-3xl font-bold text-emerald-400 mt-2">92.7</p>
            </div>
          </div>

          {/* Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">Floor Space Calculator</h2>
              <FloorSpaceChecker />
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">Heavy Haul Compliance Checker</h2>
              <HeavyHaulChecker />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
