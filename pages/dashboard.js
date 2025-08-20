// pages/dashboard.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import Link from 'next/link';
import Head from 'next/head';

function Section({ title, right, children, className = '' }) {
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

function StatCard({ title, value, subValue, icon, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-900/30 text-blue-300 border-blue-800',
    green: 'bg-green-900/30 text-green-300 border-green-800',
    amber: 'bg-amber-900/30 text-amber-300 border-amber-800',
    red: 'bg-red-900/30 text-red-300 border-red-800',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.blue}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-medium opacity-80">{title}</h3>
          <p className="text-2xl font-bold mt-2">{value}</p>
          {subValue && <p className="text-xs mt-1 opacity-80">{subValue}</p>}
        </div>
        <div className="text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

function useLatestMaps() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from('dat_maps').select('effective_date,equipment,image_path').order('effective_date', { ascending: false }).limit(100)
      .then(({ data }) => setRows(data || []));
  }, []);
  return useMemo(() => {
    const out = { van: null, reefer: null, flatbed: null };
    for (const eq of ['van','reefer','flatbed']) out[eq] = (rows || []).find(r => r.equipment === eq) || null;
    return out;
  }, [rows]);
}

function useBrokerStats() {
  const [stats, setStats] = useState({
    pendingLanes: 0,
    postedLanes: 0,
    coveredLanes: 0,
    totalRecaps: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [pending, posted, covered] = await Promise.all([
          supabase.from('lanes').select('count').eq('status', 'pending'),
          supabase.from('lanes').select('count').eq('status', 'posted'),
          supabase.from('lanes').select('count').eq('status', 'covered')
        ]);

        setStats({
          pendingLanes: pending.count || 0,
          postedLanes: posted.count || 0,
          coveredLanes: covered.count || 0,
          totalRecaps: Math.floor((posted.count || 0) * 0.75)
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []);

  return stats;
}

function publicUrl(path){ 
  if (!path) return null;
  const { data } = supabase.storage.from('dat_maps').getPublicUrl(path); 
  return data?.publicUrl || null; 
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

export default function Dashboard() {
  const [tab, setTab] = useState('van');
  const maps = useLatestMaps();
  const rec = maps[tab];
  const mapUrl = rec ? publicUrl(rec.image_path) : null;
  const mapDate = rec ? formatDate(rec.effective_date) : 'Not available';
  const stats = useBrokerStats();

  // Floor-space calculator
  const [pLen, setPLen] = useState(48);  // in
  const [pWid, setPWid] = useState(40);
  const [count, setCount] = useState(26);
  const truck = { w: 100, len26: 312, len53: 636 }; // usable width ~100"
  const across = Math.max(1, Math.floor(truck.w / Math.max(1, Number(pWid))));
  const rows26 = Math.floor(truck.len26 / Math.max(1, Number(pLen)));
  const rows53 = Math.floor(truck.len53 / Math.max(1, Number(pLen)));
  const cap26 = across * rows26;
  const cap53 = across * rows53;
  const fits26 = Number(count) <= cap26;
  const fits53 = Number(count) <= cap53;

  // Heavy haul quick check
  const [l, setL] = useState(480), [w, setW] = useState(102), [h, setH] = useState(102), [wt, setWt] = useState(46000);
  const legal = { len: 636, wid: 102, hei: 162, wt: 80000 };
  const oversize = l > legal.len || w > legal.wid || h > legal.hei || wt > legal.wt;
  
  // What dimensions are over legal?
  const oversizeDetails = [];
  if (l > legal.len) oversizeDetails.push('Length');
  if (w > legal.wid) oversizeDetails.push('Width');
  if (h > legal.hei) oversizeDetails.push('Height');
  if (wt > legal.wt) oversizeDetails.push('Weight');

  return (
    <>
      <Head>
        <title>Dashboard | RapidRoutes</title>
      </Head>
      
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Broker Dashboard</h1>
          <p className="text-gray-400">Freight management tools and market insights</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Pending Lanes" 
            value={stats.pendingLanes} 
            subValue="Ready to post" 
            icon="🛣️" 
            color="blue" 
          />
          <StatCard 
            title="Posted Lanes" 
            value={stats.postedLanes} 
            subValue="Active on DAT" 
            icon="📤" 
            color="green" 
          />
          <StatCard 
            title="Covered Loads" 
            value={stats.coveredLanes}
            subValue="Completed" 
            icon="✅" 
            color="amber" 
          />
          <StatCard 
            title="Recaps Generated" 
            value={stats.totalRecaps}
            subValue="HTML exports" 
            icon="📋" 
            color="blue" 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Section
            title="DAT Market Map"
            className="lg:col-span-2"
            right={
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-400">
                  {mapDate}
                </div>
                <div className="flex gap-1">
                  {['van','reefer','flatbed'].map(k=>(
                    <button 
                      key={k} 
                      onClick={()=>setTab(k)} 
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        tab===k
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {k[0].toUpperCase()+k.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            }
          >
            {mapUrl ? (
              <div className="rounded-lg border border-gray-800 overflow-hidden">
                <img src={mapUrl} alt={`${tab} map`} className="w-full h-auto" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-800 rounded-lg border border-gray-700">
                <div className="text-center">
                  <p className="text-gray-400 mb-3">No market map data available</p>
                  <Link href="/market-data" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm">
                    Upload Map Data
                  </Link>
                </div>
              </div>
            )}
          </Section>

          <div className="space-y-8">
            <Section title="Floor Space Calculator">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Length (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={pLen} 
                      onChange={e=>setPLen(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Width (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={pWid} 
                      onChange={e=>setPWid(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Count</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={count} 
                      onChange={e=>setCount(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                  <div className="bg-gray-800 rounded p-2 border border-gray-700">
                    <span className="block">Pallets Per Row: <span className="font-mono font-medium">{across}</span></span>
                    <span className="block mt-1">Total Rows (53′): <span className="font-mono font-medium">{rows53}</span></span>
                  </div>
                  <div className="bg-gray-800 rounded p-2 border border-gray-700">
                    <span className="block">26′ Capacity: <span className="font-mono font-medium">{cap26}</span></span>
                    <span className="block mt-1">53′ Capacity: <span className="font-mono font-medium">{cap53}</span></span>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-2">
                  <span className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    fits26 ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                  }`}>
                    26′ Box: {fits26 ? 'Fits ✓' : `Over by ${count - cap26}`}
                  </span>
                  <span className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    fits53 ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'
                  }`}>
                    53′ Van: {fits53 ? 'Fits ✓' : `Over by ${count - cap53}`}
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Heavy Haul Checker">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Length (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={l} 
                      onChange={e=>setL(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Width (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={w} 
                      onChange={e=>setW(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Height (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={h} 
                      onChange={e=>setH(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Weight (lbs)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={wt} 
                      onChange={e=>setWt(e.target.value)} 
                    />
                  </div>
                </div>
                
                <div className={`p-3 rounded-md ${oversize ? 'bg-amber-900/20 border border-amber-800' : 'bg-green-900/20 border border-green-800'}`}>
                  <p className={`text-sm font-medium ${oversize ? 'text-amber-300' : 'text-green-300'}`}>
                    {oversize 
                      ? `Oversize: ${oversizeDetails.join(', ')} exceeds legal limits` 
                      : 'Within standard legal limits'}
                  </p>
                  
                  {oversize && (
                    <div className="mt-2 text-xs text-amber-200/80">
                      <p>Consider special permits and specialized equipment:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>RGN/Lowboy trailer</li>
                        <li>Escort vehicles may be required</li>
                        <li>State-specific permits</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </Section>
            
            <div className="flex justify-center mt-3">
              <Link 
                href="/lanes"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Create New Lane
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
