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
  const [uploadMessage, setUploadMessage] = useState('');
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes('image/png')) {
      setUploadMessage('Error: Only PNG files are allowed');
      return;
    }

    // Get equipment type from filename
    const filename = file.name.toLowerCase();
    let equipmentType = 'general';
    
    if (filename.includes('dv_') || filename.includes('dry_van') || filename.includes('van')) {
      equipmentType = 'dry_van';
    } else if (filename.includes('f_') || filename.includes('flatbed') || filename.includes('flat')) {
      equipmentType = 'flatbed';
    } else if (filename.includes('r_') || filename.includes('reefer') || filename.includes('refrigerated')) {
      equipmentType = 'reefer';
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('equipmentType', equipmentType);

    try {
      setUploadMessage('Uploading...');
      const response = await fetch('/api/admin/upload-market-map', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadMessage(`Success: ${result.filename} uploaded as ${equipmentType.replace('_', ' ').toUpperCase()}`);
        setTimeout(() => setUploadMessage(''), 5000);
      } else {
        setUploadMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`Error: ${error.message}`);
    }
  };

  const removeDuplicates = async () => {
    if (!confirm('Remove duplicate lanes? This cannot be undone.')) return;
    
    try {
      setUploadMessage('Removing duplicates...');
      const response = await fetch('/api/admin/remove-duplicates', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadMessage(`Success: ${result.message}`);
        setTimeout(() => setUploadMessage(''), 5000);
      } else {
        setUploadMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage(`Error: ${error.message}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Head>
        <title>Admin Dashboard | RapidRoutes</title>
      </Head>
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage user accounts and market heat map uploads</p>
      </div>

      {/* Market Heat Map Upload Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden mb-6">
        <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Market Heat Map Upload</h2>
        </div>
        <div className="p-4 bg-gray-900">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload PNG Heat Map
              </label>
              <input
                type="file"
                accept=".png"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-300 bg-gray-800 border border-gray-600 rounded-lg cursor-pointer focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload weekly market heat map PNG files for DAT market analysis<br/>
                <strong>Naming:</strong> DV_825 (Dry Van), F_825 (Flatbed), R_825 (Reefer)
              </p>
            </div>
            
            <div className="border-t border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">🗑️ Database Maintenance</h3>
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-300 mb-2">
                  <strong>What this does:</strong> Removes duplicate lanes that have the same origin, destination, and equipment type. 
                  Duplicate lanes cause CSV exports to have repeated rows, violating DAT's 499-row limit.
                </p>
                <p className="text-xs text-yellow-300">
                  <strong>Safe to use:</strong> Only removes exact duplicates, keeps the original (oldest) lane.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={removeDuplicates}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium"
                >
                  🗑️ Remove Duplicate Lanes
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Recommended:</strong> Run this before generating CSV exports to ensure data quality
              </p>
            </div>
            
            {uploadMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                uploadMessage.startsWith('Error') 
                  ? 'bg-red-900/20 border border-red-700 text-red-300'
                  : uploadMessage.startsWith('Success')
                  ? 'bg-green-900/20 border border-green-700 text-green-300'
                  : 'bg-blue-900/20 border border-blue-700 text-blue-300'
              }`}>
                {uploadMessage}
              </div>
            )}
          </div>
        </div>
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
                {users
                  .filter(u => u.id !== user?.id) // Hide current admin's own account
                  .filter(u => u.status !== 'Approved' || u.role !== 'Admin') // Hide other approved admins
                  .map((u) => (
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
                {users.filter(u => u.id !== user?.id).filter(u => u.status !== 'Approved' || u.role !== 'Admin').length === 0 && (
                  <tr className="bg-gray-900">
                    <td colSpan="5" className="px-4 py-8 text-center text-gray-400">
                      No pending user actions required
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
