import { useState, useEffect } from 'react';
import supabase from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

function PendingUsers() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, profile } = useAuth();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }
      if (profile?.role !== 'Admin') {
        router.replace('/unauthorized');
        return;
      }
      // User is authenticated and is admin
      loadPendingUsers();
    }
  }, [authLoading, isAuthenticated, profile, router]);
  
  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading Pending Users...</p>
        </div>
      </div>
    );
  }
  
  // Show loading if not authenticated/authorized (during redirect)
  if (!isAuthenticated || profile?.role !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Checking authorization...</p>
        </div>
      </div>
    );
  }

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

export default PendingUsers;
