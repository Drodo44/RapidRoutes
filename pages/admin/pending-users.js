import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import withAuth from '../../middleware/withAuth';
import toast from 'react-hot-toast';

function PendingUsers() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  async function loadPendingUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (err) {
      console.error('Error loading pending users:', err);
      toast.error('Failed to load pending users');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId, action) {
    try {
      const response = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': (await supabase.auth.getUser()).data.user.id
        },
        body: JSON.stringify({ userId, action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process user');
      }

      toast.success(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadPendingUsers(); // Refresh the list
    } catch (err) {
      console.error(`Error ${action}ing user:`, err);
      toast.error(`Failed to ${action} user`);
    }
  }

  if (loading) {
    return <div className="text-gray-400">Loading pending users...</div>;
  }

  if (!pendingUsers.length) {
    return <div className="text-gray-400">No pending users to review</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-blue-400 mb-4">Pending Users</h2>
      <div className="grid gap-4">
        {pendingUsers.map((user) => (
          <div 
            key={user.id}
            className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-white font-medium">{user.email}</div>
              <div className="text-sm text-gray-400">
                Signed up {new Date(user.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction(user.id, 'approve')}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(user.id, 'reject')}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuth(PendingUsers, { requiredRole: 'Admin' });
