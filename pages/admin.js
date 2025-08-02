// pages/admin.js

import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const updateRole = async (id, newRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", id);
    fetchUsers();
  };

  const removeUser = async (id) => {
    await supabase.from("profiles").delete().eq("id", id);
    fetchUsers();
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-10">
      <h1 className="text-4xl font-bold text-neon-blue mb-6">Admin – User Management</h1>
      {loading ? (
        <div className="text-blue-400">Loading users...</div>
      ) : (
        <table className="w-full text-left bg-gray-900 rounded-xl">
          <thead>
            <tr className="bg-gray-800 text-cyan-400">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-700">
                <td className="p-3">{u.name || "(No name)"}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3 space-x-2">
                  {["Admin", "Broker", "Support", "Apprentice"].map((r) => (
                    <button
                      key={r}
                      onClick={() => updateRole(u.id, r)}
                      className={`px-3 py-1 rounded ${
                        u.role === r ? "bg-green-600" : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                  <button
                    onClick={() => removeUser(u.id)}
                    className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
