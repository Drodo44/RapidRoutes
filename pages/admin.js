import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Admin() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setUsers(data || []);
  };

  const changeRole = async (id, role) => {
    await supabase.from("profiles").update({ role }).eq("id", id);
    fetchUsers();
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-cyan-400 drop-shadow mb-6">Admin Panel</h1>
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow">
        <h2 className="text-xl text-cyan-300 mb-4">Manage Users</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-cyan-500/30">
              <th>Email</th>
              <th>Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-cyan-500/20">
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => changeRole(user.id, e.target.value)}
                    className="bg-[#1b2a44] text-white rounded p-1"
                  >
                    <option value="Broker">Broker</option>
                    <option value="Admin">Admin</option>
                    <option value="Support">Support</option>
                    <option value="Apprentice">Apprentice</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
