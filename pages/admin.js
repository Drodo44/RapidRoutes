// pages/admin.js

import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

export default function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error) setUsers(data);
  };

  const handleRoleChange = async (userId, newRole) => {
    await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
    fetchUsers();
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white py-12 px-4">
      <div className="max-w-5xl mx-auto bg-[#1a2236] rounded-2xl shadow-2xl p-6">
        <h1 className="text-3xl font-bold text-neon-blue mb-6 text-center">Admin Panel</h1>
        <table className="w-full text-left">
          <thead className="text-neon-blue">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Update</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="even:bg-[#202b42] odd:bg-[#1a2437]">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-gray-800 text-white px-3 py-1 rounded"
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
    </main>
  );
}
