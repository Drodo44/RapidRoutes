// pages/admin.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import Head from 'next/head';ages/admin.js
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
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Head>
        <title>Admin Dashboard | RapidRoutes</title>
      </Head>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage user accounts and permissions</p>
      </div>

      {loading ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg p-6">
          <p className="text-center text-gray-400">Loading users...</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-100">User Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {users.map((u) => (
                  <tr key={u.id} className="bg-gray-900">
                    <td className="px-4 py-3 text-sm text-gray-100">{u.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-100">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-100">{u.role}</td>
                    <td className="px-4 py-3 text-sm">
                      {u.status === "Blocked" ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-900 text-red-300 rounded-full">Blocked</span>
                      ) : u.status === "Approved" ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-900 text-green-300 rounded-full">Approved</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-900 text-yellow-300 rounded-full">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {u.status !== "Approved" && (
                        <button
                          onClick={() => handleApproval(u.id, "Approved")}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium"
                        >
                          Approve
                        </button>
                      )}
                      {u.status !== "Blocked" && (
                        <button
                          onClick={() => handleApproval(u.id, "Blocked")}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium"
                        >
                          Block
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
