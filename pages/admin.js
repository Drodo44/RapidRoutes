import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

export default function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from("profiles").select("*");
      setUsers(data || []);
    };
    loadUsers();
  }, []);

  const approveUser = async (id) => {
    await supabase.from("profiles").update({ role: "Broker" }).eq("id", id);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: "Broker" } : u))
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <table className="w-full text-left border border-gray-800">
          <thead className="bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Approve</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-800">
                <td className="p-3">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.role}</td>
                <td className="p-3">
                  {user.role === "Apprentice" ? (
                    <button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1 rounded"
                      onClick={() => approveUser(user.id)}
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-gray-400">Approved</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}
