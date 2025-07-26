import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useRouter } from 'next/router';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUser(user);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!p || p.role !== 'Admin') return router.push('/dashboard');
      setProfile(p);
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile && profile.role === 'Admin') {
      supabase.from('profiles').select('*').then(({ data }) => setUsers(data || []));
    }
  }, [profile]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Admin Dashboard</h1>
      {users.length === 0 ? <p className="text-gray-400">Loading users...</p> : (
        <table className="w-full text-left border-collapse bg-gray-900 rounded-xl shadow-lg">
          <thead>
            <tr className="text-emerald-400">
              <th className="border-b p-2">Email</th>
              <th className="border-b p-2">Role</th>
              <th className="border-b p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800">
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
