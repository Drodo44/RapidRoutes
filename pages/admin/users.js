import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';

export default function UserManagement() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchUsers();
  }, [isAdmin, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetch('/api/admin/update-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (!response.ok) throw new Error('Failed to update user role');
      
      setSuccessMessage(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to delete user');
      
      setSuccessMessage('User deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-red-600';
      case 'Broker': return 'bg-blue-600';
      case 'Support': return 'bg-green-600';
      case 'Apprentice': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  if (!isAdmin) {
    return <div className="text-white">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">👥 User Management</h1>
            <p className="text-gray-400 mt-2">Manage user accounts and access control</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded mb-6">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                All Users ({users.length})
              </h2>
              
              {users.length === 0 ? (
                <p className="text-gray-400">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="pb-3 text-gray-300">User</th>
                        <th className="pb-3 text-gray-300">Email</th>
                        <th className="pb-3 text-gray-300">Role</th>
                        <th className="pb-3 text-gray-300">Created</th>
                        <th className="pb-3 text-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-700">
                          <td className="py-3">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {user.full_name || 'No name'}
                                </div>
                                <div className="text-sm text-gray-400">
                                  ID: {user.id.substring(0, 8)}...
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-gray-300">{user.email}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getRoleBadgeColor(user.role)}`}>
                              {user.role || 'Apprentice'}
                            </span>
                          </td>
                          <td className="py-3 text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center space-x-2">
                              <select
                                value={user.role || 'Apprentice'}
                                onChange={(e) => updateUserRole(user.id, e.target.value)}
                                className="bg-gray-700 border border-gray-600 text-white text-sm rounded px-2 py-1"
                              >
                                <option value="Apprentice">Apprentice</option>
                                <option value="Support">Support</option>
                                <option value="Broker">Broker</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                                disabled={user.id === user?.id} // Prevent self-deletion
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">🔒 Role Permissions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-red-900/20 border border-red-700 rounded p-3">
              <div className="flex items-center mb-2">
                <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium mr-2">Admin</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Full system access</li>
                <li>• User management</li>
                <li>• Database control</li>
                <li>• System settings</li>
              </ul>
            </div>
            <div className="bg-blue-900/20 border border-blue-700 rounded p-3">
              <div className="flex items-center mb-2">
                <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium mr-2">Broker</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Lane creation</li>
                <li>• CSV generation</li>
                <li>• Freight tools</li>
                <li>• Full dashboard</li>
              </ul>
            </div>
            <div className="bg-green-900/20 border border-green-700 rounded p-3">
              <div className="flex items-center mb-2">
                <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium mr-2">Support</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• View lanes</li>
                <li>• Basic tools</li>
                <li>• Limited access</li>
                <li>• Report generation</li>
              </ul>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3">
              <div className="flex items-center mb-2">
                <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs font-medium mr-2">Apprentice</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Read-only access</li>
                <li>• Basic dashboard</li>
                <li>• Learning mode</li>
                <li>• Limited tools</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
