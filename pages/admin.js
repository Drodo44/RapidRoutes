// pages/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import Head from 'next/head';

function Section({ title, children, right, className = '' }) {
  return (
    <section className={`bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden ${className}`}>
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        {right}
      </div>
      <div className="p-4 bg-gray-900">{children}</div>
    </section>
  );
}

export default function Admin() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      const { data: sessionData } = await supabase.auth.getUser();
      const currentUser = sessionData.user;

      if (!currentUser) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (profile?.role !== "Admin") {
        alert("Access Denied – Admins Only");
        router.push("/dashboard");
        return;
      }

      setUser(currentUser);
      fetchAllUsers();
    };

    const fetchAllUsers = async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (!error) setUsers(data || []);
      setLoading(false);
    };

    checkAccess();
  }, []);

  const handleApproval = async (id, newStatus) => {
    await supabase
      .from("profiles")
      .update({ status: newStatus })
      .eq("id", id);
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
    );
  };

  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to delete this user?");
    if (!confirm) return;

    await supabase.from("profiles").delete().eq("id", id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-6 text-cyan-400 text-center">Admin Dashboard</h1>

      {loading ? (
        <p className="text-center text-gray-400">Loading users...</p>
      ) : (
        <div className="overflow-x-auto bg-[#1a2236] p-6 rounded-2xl shadow-2xl max-w-5xl mx-auto">
          <table className="w-full border-collapse text-left text-white">
            <thead>
              <tr className="bg-gray-800 text-cyan-400">
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="even:bg-[#202b42] odd:bg-[#1a2437]">
                  <td className="p-3">{u.name || "—"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    {u.status === "Blocked" ? (
                      <span className="text-red-400 font-semibold">Blocked</span>
                    ) : u.status === "Approved" ? (
                      <span className="text-green-400 font-semibold">Approved</span>
                    ) : (
                      <span className="text-yellow-300 font-semibold">Pending</span>
                    )}
                  </td>
                  <td className="p-3 space-x-2">
                    {u.status !== "Approved" && (
                      <button
                        onClick={() => handleApproval(u.id, "Approved")}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded font-semibold"
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== "Blocked" && (
                      <button
                        onClick={() => handleApproval(u.id, "Blocked")}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-semibold"
                      >
                        Block
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="bg-gray-700 hover:bg-gray-800 px-3 py-1 rounded font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
