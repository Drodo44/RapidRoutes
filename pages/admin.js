import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

export default function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) console.error("Error loading users", error);
      else setUsers(data || []);
    };

    fetchUsers();
  }, []);

  const updateRole = async (id, role) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white py-10 px-6">
        <div className="max-w-4xl mx-auto bg-[#1e293b] p-6 rounded-xl shadow">
          <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">Admin Panel</h1>
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-blue-300 border-b border-gray-600">
                <th className="py-2">Email</th>
                <th>Role</th>
                <th>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-800">
                  <td className="py-2">{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="bg-gray-700 text-white rounded px-2 py-1"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Broker">Broker</option>
                      <option value="Support">Support</option>
                      <option value="Apprentice">Apprentice</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
