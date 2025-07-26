import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';
import { useRouter } from 'next/router';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [blocklist, setBlocklist] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUser(user);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(p);
      setBlocklist(p?.blocklist || '');
    };
    fetchProfile();
  }, []);

  const save = async () => {
    await supabase.from('profiles').update({ blocklist }).eq('id', user.id);
    alert('Settings saved.');
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Settings</h1>
      {profile ? (
        <div className="bg-gray-900 p-4 rounded-2xl shadow-lg space-y-4 max-w-lg">
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <div>
            <label className="block mb-2 text-gray-300">ZIP/KMA Blocklist (comma-separated)</label>
            <textarea value={blocklist} onChange={(e) => setBlocklist(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded-lg w-full" />
          </div>
          <button onClick={save} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-lg">
            Save Settings
          </button>
        </div>
      ) : <p className="text-gray-400">Loading...</p>}
    </main>
  );
}
