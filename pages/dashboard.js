import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import FloorSpaceChecker from '../components/FloorSpaceChecker';
import HeavyHaulChecker from '../components/HeavyHaulChecker';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', session.user.id)
          .single();
        setName(profile?.name || 'Broker');
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-1">Welcome back, {name}</h1>
        <p className="text-md text-gray-400 mb-8 italic">Where algorithmic intelligence meets AI automation</p>

        {/* Stats Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg shadow p-6 text-center">
            <p className="text-4xl font-bold text-emerald-400">23</p>
            <p className="text-gray-400">Lanes Posted Today</p>
          </div>
          <div className="bg-gray-900 rounded-lg shadow p-6 text-center">
            <p className="text-4xl font-bold text-cyan-400">87%</p>
            <p className="text-gray-400">Engagement Rate</p>
          </div>
          <div className="bg-gray-900 rounded-lg shadow p-6 text-center">
            <p className="text-4xl font-bold text-yellow-400">$4,280</p>
            <p className="text-gray-400">Revenue Generated</p>
          </div>
        </div>

        {/* Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Floor Space Checker</h2>
            <FloorSpaceChecker />
          </div>
          <div className="bg-gray-900 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Heavy Haul Checker</h2>
            <HeavyHaulChecker />
          </div>
        </div>
      </div>
    </div>
  );
}
