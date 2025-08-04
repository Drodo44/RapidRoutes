import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { useEffect, useState } from 'react';

export default function Navbar({ user }) {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        setName(data?.name || user.email);
      }
    };
    fetchName();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md">
      <div className="text-xl font-bold text-white">RapidRoutes</div>
      <div className="space-x-4 flex items-center">
        <Link href="/dashboard" className="hover:text-emerald-400">Dashboard</Link>
        <Link href="/lanes" className="hover:text-emerald-400">Lanes</Link>
        <Link href="/recap" className="hover:text-emerald-400">Recap</Link>
        <Link href="/admin" className="hover:text-emerald-400">Admin</Link>
        <Link href="/settings" className="hover:text-emerald-400">Settings</Link>
        <span className="text-sm text-gray-300">Hi, {name}</span>
        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm">Logout</button>
      </div>
    </nav>
  );
}
