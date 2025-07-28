// /pages/admin.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("id, email, role");
      if (!error) setUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const changeRole = async (id, role) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">Admin Dashboard</h1>
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-2xl w-full">
        {loading ? (
          <p className="text-blue-400">Loading users...</p>
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-gray-800 text-cyan-400">
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="even:bg-gray-800 odd:bg-gray-700">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.role}</td>
                  <td className="p-3">
                    <select value={user.role} onChange={(e) => changeRole(user.id, e.target.value)}
                      className="bg-gray-700 p-1 rounded">
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
        )}
      </div>
    </div>
  );
}
