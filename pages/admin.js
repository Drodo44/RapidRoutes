import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.data?.session?.user;
      if (!user) return router.push("/login");

      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (adminProfile?.role !== "Admin") {
        return router.push("/dashboard");
      }

      const { data: pending, error: pendingError } = await supabase
        .from("pending_users")
        .select("*");

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*");

      if (pendingError || profileError) {
        throw new Error("Error loading users");
      }

      setPendingUsers(pending);
      setApprovedUsers(profiles);
    } catch (err) {
      setError(err.message || "Unexpected error");
    }
    setLoading(false);
  }

  async function approveUser(pendingUser) {
    const { id, email, name, role } = pendingUser;

    const { error: insertError } = await supabase
      .from("profiles")
      .insert([{ id, email, name, role: role || "Apprentice", active: true }]);

    if (!insertError) {
      await supabase.from("pending_users").delete().eq("id", id);
      fetchUsers();
    } else {
      setError(insertError.message);
    }
  }

  async function deactivateUser(id) {
    const { error } = await supabase
      .from("profiles")
      .update({ active: false })
      .eq("id", id);

    if (!error) fetchUsers();
  }

  async function activateUser(id) {
    const { error } = await supabase
      .from("profiles")
      .update({ active: true })
      .eq("id", id);

    if (!error) fetchUsers();
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Admin Dashboard</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-white mb-2">Pending Users</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-gray-400">No pending users</p>
        ) : (
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden text-sm">
            <thead className="bg-gray-700 text-cyan-300">
              <tr>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2">Approve</th>
              </tr>
            </thead>
            <tbody>
              {pendingUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.role || "Apprentice"}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => approveUser(user)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-white mb-2">Approved Users</h2>
        {approvedUsers.length === 0 ? (
          <p className="text-gray-400">No approved users</p>
        ) : (
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden text-sm">
            <thead className="bg-gray-700 text-cyan-300">
              <tr>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-center">Active</th>
                <th className="p-2 text-center">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-700">
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.name}</td>
                  <td className="p-2">{user.role}</td>
                  <td className="p-2 text-center">
                    {user.active ? "✅" : "❌"}
                  </td>
                  <td className="p-2 text-center">
                    {user.active ? (
                      <button
                        onClick={() => deactivateUser(user.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(user.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                      >
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
