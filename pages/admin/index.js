// pages/admin/index.js
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

function AdminDashboard() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

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
      loadStats();
    }
  }, [authLoading, isAuthenticated, profile, router]);
  
  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading Admin Dashboard...</p>
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

  async function loadStats() {
    try {
      // Load basic stats
      const [lanesResult, citiesResult, equipmentResult] = await Promise.all([
        supabase.from('lanes').select('id').eq('status', 'active'),
        supabase.from('cities').select('id'),
        supabase.from('equipment_codes').select('code')
      ]);

      setStats({
        activeLanes: lanesResult.data?.length || 0,
        totalCities: citiesResult.data?.length || 0,
        equipmentTypes: equipmentResult.data?.length || 0
      });
      
    } catch (error) {
      console.error('Stats loading failed:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading admin panel...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-red-400 mb-2">Access Denied</div>
          <div className="text-gray-400">Administrator privileges required</div>
          <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md">
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const adminTools = [
    {
      title: '👥 User Management',
      description: 'Manage user accounts and access control',
      href: '/admin/users',
      color: 'blue',
      priority: 'high'
    },
    {
      title: '🏛️ City Database',
      description: 'Manage cities and geographic data',
      href: '/admin/city-manager',
      color: 'green',
      priority: 'medium'
    },
    {
      title: '⚙️ Equipment Types',
      description: 'Manage DAT equipment codes and categories',
      href: '/admin/equipment',
      color: 'purple',
      priority: 'medium'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">🔧 Admin Control Panel</h1>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* System Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-green-400 mb-2">Active Lanes</h3>
            <div className="text-3xl font-bold">{stats.activeLanes}</div>
            <div className="text-sm text-gray-400">Currently being exported</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Pending Users</h3>
            <div className="text-3xl font-bold">{stats.pendingUsers || 0}</div>
            <div className="text-sm text-gray-400">
              <Link href="/admin/pending-users" className="text-blue-400 hover:text-blue-300">
                Review applications →
              </Link>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Cities in Database</h3>
            <div className="text-3xl font-bold">{stats.totalCities}</div>
            <div className="text-sm text-gray-400">Geographic locations</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Equipment Types</h3>
            <div className="text-3xl font-bold">{stats.equipmentTypes}</div>
            <div className="text-sm text-gray-400">DAT equipment codes</div>
          </div>
        </div>

        {/* Admin Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminTools.map((tool) => {
            const colorClasses = {
              blue: 'border-blue-500 hover:border-blue-400 bg-blue-900/20',
              green: 'border-green-500 hover:border-green-400 bg-green-900/20',
              yellow: 'border-yellow-500 hover:border-yellow-400 bg-yellow-900/20',
              purple: 'border-purple-500 hover:border-purple-400 bg-purple-900/20'
            };

            const priorityBadge = {
              high: 'bg-red-600 text-white',
              medium: 'bg-yellow-600 text-white',
              low: 'bg-gray-600 text-gray-200'
            };

            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={`block p-6 rounded-lg border-2 transition-all hover:scale-105 ${colorClasses[tool.color]}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-semibold">{tool.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${priorityBadge[tool.priority]}`}>
                    {tool.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-300">{tool.description}</p>
                <div className="mt-4 text-blue-400 font-medium">
                  Access Tool →
                </div>
              </Link>
            );
          })}
        </div>


      </div>
    </div>
  );
}

// Wrap with auth HOC and require Admin role
export default AdminDashboard;
