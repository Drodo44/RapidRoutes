import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: usersData } = await supabase.from("profiles").select("id, email, role");
    setUsers(usersData || []);
    const { data: reqsData } = await supabase.from("pending_users").select("*");
    setRequests(reqsData || []);
    setLoading(false);
  }

  async function approveRequest(request) {
    // Create Supabase Auth user and add to profiles table
    const { error: signupErr } = await supabase.auth.admin.createUser({
      email: request.email,
      email_confirm: true,
      user_metadata: { name: request.name, role: request.role }
    });
    if (signupErr) {
      alert("Error creating user: " + signupErr.message);
      return;
    }
    // Add to profiles table
    await supabase.from("profiles").insert({
      email: request.email,
      role: request.role,
      name: request.name
    });
    // Remove request
    await supabase.from("pending_users").delete().eq("id", request.id);
    alert(`Approved ${request.name} (${request.email}). They will receive an activation email.`);
    fetchData();
  }

  async function denyRequest(request) {
    await supabase.from("pending_users").delete().eq("id", request.id);
    alert(`Denied ${request.name} (${request.email}).`);
    fetchData();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">Admin Dashboard</h1>
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-2xl w-full mb-8">
        <h2 className="text-2xl font-bold mb-4">Pending Requests</h2>
        {loading ? (
          <p className="text-blue-400">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-green-400">No pending account requests.</p>
        ) : (
          <table className="min-w-full text-left mb-6">
            <thead>
              <tr className="bg-gray-800 text-cyan-400">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Date</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.id} className="even:bg-gray-800 odd:bg-gray-700">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{r.email}</td>
                  <td className="p-3">{r.role}</td>
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => approveRequest(r)} className="bg-green-600 hover:bg-green-700 text-white px-3 rounded">Approve</button>
                    <button onClick={() => denyRequest(r)} className="bg-red-700 hover:bg-red-900 text-white px-3 rounded">Deny</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-4">All Users</h2>
        {loading ? (
          <p className="text-blue-400">Loading...</p>
        ) : (
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-gray-800 text-cyan-400">
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="even:bg-gray-800 odd:bg-gray-700">
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
