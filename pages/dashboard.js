import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Dashboard() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.data?.session?.user;
    if (!user) return router.push("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) return router.push("/login");

    setRole(profile.role);
    setLoading(false);
  }

  if (loading) return <div className="text-white p-8">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">
        {role} Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-4 rounded-xl shadow-md">
          <h2 className="text-lg text-white font-semibold mb-2">Postings This Week</h2>
          <p className="text-3xl text-cyan-300 font-bold">28</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl shadow-md">
          <h2 className="text-lg text-white font-semibold mb-2">New Leads</h2>
          <p className="text-3xl text-emerald-300 font-bold">9</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl shadow-md">
          <h2 className="text-lg text-white font-semibold mb-2">Pending Lanes</h2>
          <p className="text-3xl text-yellow-300 font-bold">4</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-xl shadow-md">
          <h2 className="text-lg text-white font-semibold mb-2">Broker Score</h2>
          <p className="text-3xl text-blue-300 font-bold">92%</p>
        </div>
      </div>
    </main>
  );
}
