// pages/admin.js
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";
import Image from "next/image";
import ProtectedRoute from "../components/ProtectedRoute";

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  const updateStatus = async (id, updates) => {
    await supabase.from("profiles").update(updates).eq("id", id);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
    );
  };

  return (
    <ProtectedRoute allow={["Admin"]}>
      <div className="min-h-screen bg-[#111827] text-white p-10">
        <div className="flex items-center gap-4 mb-6">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h1 className="text-4xl font-bold text-neon-blue">Admin Panel</h1>
        </div>

        {loading ? (
          <p className="text-blue-400">Loading users...</p>
        ) : (
          <div className="bg-[#1a2236] rounded-xl shadow-xl p-6">
            <table className="w-full text-left">
              <thead>
                <tr className="text-cyan-400 border-b border-gray-600">
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Active</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700">
                    <td className="p-2">{u.email}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.active ? "✅" : "❌"}</td>
                    <td className="p-2 flex gap-2">
                      {!u.active && (
                        <button
                          onClick={() => updateStatus(u.id, { active: true })}
                          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                      )}
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateStatus(u.id, { role: e.target.value })
                        }
                        className="bg-gray-700 p-1 rounded text-sm"
                      >
                        <option>Admin</option>
                        <option>Broker</option>
                        <option>Support</option>
                        <option>Apprentice</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default AdminPage;
