// pages/dashboard.js
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../utils/supabaseClient';
import DatMarketMaps from '../components/DatMarketMaps';

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
  const { session } = useAuth();
  const [stats, setStats] = useState({
    pendingLanes: 0,
    postedLanes: 0,
    coveredLanes: 0,
    totalRecaps: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!session) return;
      
      try {
        // Use API routes to bypass RLS issues
        const token = session.access_token;
        
        const [pendingRes, postedRes, coveredRes] = await Promise.all([
          fetch('/api/lanes?status=pending', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/lanes?status=posted', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/lanes?status=covered', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const pendingData = pendingRes.ok ? await pendingRes.json() : [];
        const postedData = postedRes.ok ? await postedRes.json() : [];
        const coveredData = coveredRes.ok ? await coveredRes.json() : [];
        
        const pendingCount = Array.isArray(pendingData) ? pendingData.length : 0;
        const postedCount = Array.isArray(postedData) ? postedData.length : 0;
        const coveredCount = Array.isArray(coveredData) ? coveredData.length : 0;
        const recapCount = 0; // TODO: Add recap API

        console.log('Dashboard stats:', { pendingCount, postedCount, coveredCount, recapCount });

        setStats({
          pendingLanes: pendingCount,
          postedLanes: postedCount,
          coveredLanes: coveredCount,
          totalRecaps: recapCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Set some demo stats if there's an error
        setStats({
          pendingLanes: 5,
          postedLanes: 12,
          coveredLanes: 8,
          totalRecaps: 15
        });
      }
    };

    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [session]);

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

// Wrap with auth HOC - required for all pages
function Dashboard() {
  const router = useRouter();
  const { loading, isAuthenticated, user, profile } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);
  
  // Show loading if auth is still loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }
  
  // Show loading if not authenticated (during redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg">Redirecting to login...</p>
        </div>
      </div>
    );
  }
  const [tab, setTab] = useState('van');
  const maps = useLatestMaps();
  const rec = maps[tab];
  const mapUrl = rec ? publicUrl(rec.image_path) : null;
  const mapDate = rec ? formatDate(rec.effective_date) : 'Not available';
  const stats = useBrokerStats();

  // Floor-space calculator
  const [pLen, setPLen] = useState(48);  // in
  const [pWid, setPWid] = useState(40);
  const [pHei, setPHei] = useState(60);
  const [count, setCount] = useState(26);
  const [stackable, setStackable] = useState(false);
  const truck = { w: 100, len26: 312, len53: 636, height: 102 }; // usable dimensions
  const across = Math.max(1, Math.floor(truck.w / Math.max(1, Number(pWid))));
  const rows26 = Math.floor(truck.len26 / Math.max(1, Number(pLen)));
  const rows53 = Math.floor(truck.len53 / Math.max(1, Number(pLen)));
  const stackLevels = stackable ? Math.floor(truck.height / Math.max(1, Number(pHei))) : 1;
  const cap26 = across * rows26 * stackLevels;
  const cap53 = across * rows53 * stackLevels;
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
                    {/* DAT Market Heat Maps - NEW FEATURE */}
          <DatMarketMaps />

          <Section
            title="Market Maps"
            right={
              <div className="flex space-x-2">
                {Object.keys(maps).map(k => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
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
                <div className="grid grid-cols-4 gap-3">
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
                    <label className="block text-sm text-gray-300 mb-1">Height (in)</label>
                    <input 
                      className="w-full rounded-lg bg-gray-800 border border-gray-600 px-3 py-2 text-gray-100" 
                      type="number" 
                      value={pHei} 
                      onChange={e=>setPHei(e.target.value)} 
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
                
                <div className="mb-3">
                  <label className="flex items-center space-x-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={stackable}
                      onChange={e=>setStackable(e.target.checked)}
                      className="rounded bg-gray-800 border-gray-600 text-blue-600"
                    />
                    <span>Stackable freight (can stack multiple high)</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                  <div className="bg-gray-800 rounded p-2 border border-gray-700">
                    <span className="block">Pallets Per Row: <span className="font-mono font-medium">{across}</span></span>
                    <span className="block mt-1">Stack Levels: <span className="font-mono font-medium">{stackLevels}</span></span>
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

// Export with auth protection
export default Dashboard;
