// pages/recap.js
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from '@/components/ui/button';

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('lanes').select('*');
      setLanes(data || []);
    }
    load();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-cyan-400">Active Lane Recap</h1>
        <a href="/api/export/recap">
          <Button>Download Recap Excel</Button>
        </a>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {lanes.map((lane, idx) => (
          <div key={idx} className="bg-gray-800 p-4 rounded-xl shadow-md">
            <div className="text-lg font-semibold">
              {lane.origin} → {lane.destination}
            </div>
            <div className="text-sm text-gray-400">
              Equipment: {lane.equipment} | {lane.length} ft |{' '}
              {lane.randomizeWeight
                ? `${lane.randomLow}-${lane.randomHigh} lbs`
                : `${lane.baseWeight} lbs`}
            </div>
            <div className="text-sm mt-1 text-gray-400">
              Pickup: {lane.dateEarliest} - {lane.dateLatest} | Commodity: {lane.commodity}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
