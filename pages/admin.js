// pages/admin.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (!data.session) return router.push("/login");

      const userId = data.session.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profile?.role !== "Admin") router.push("/dashboard");
    };

    getSession();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!error) setProfiles(data || []);
    setLoading(false);
  };

  const updateRole = async (id, role) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    fetchProfiles();
  };

  const deactivateUser = async (id) => {
    await supabase.from("profiles").update({ active: false }).eq("id", id);
    fetchProfiles();
  };

  const reactivateUser = async (id) => {
    await supabase.from("profiles").update({ active: true }).eq("id", id);
    fetchProfiles();
  };

  return (
    <main className="min-h-screen bg-[#0b1623] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Admin Panel</h1>
        {loading ? (
          <div>Loading users...</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-cyan-300 border-b border-gray-600">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((user) => (
                <tr
                  key={user.id}
                  className="even:bg-[#1a2437] odd:bg-[#202b42] border-b border-gray-700"
                >
                  <td className="p-2">{user.name || "–"}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2">{user.active === false ? "Inactive" : "Active"}</td>
                  <td className="p-2 text-center flex gap-2 flex-wrap">
                    {user.role !== "Admin" && (
                      <button
                        onClick={() => updateRole(user.id, "Admin")}
                        className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm"
                      >
                        Promote to Admin
                      </button>
                    )}
                    {user.role !== "Broker" && (
                      <button
                        onClick={() => updateRole(user.id, "Broker")}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                      >
                        Set as Broker
                      </button>
                    )}
                    {user.active !== false ? (
                      <button
                        onClick={() => deactivateUser(user.id)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivateUser(user.id)}
                        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
