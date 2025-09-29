// pages/post-options.manual.js
// Manual Post Options workflow: choose nearby origin/destination posting cities
import { useEffect, useState, useMemo } from 'react';
import supabase from '../utils/supabaseClient';
import Link from 'next/link';

export default function PostOptionsManual() {
  const [user, setUser] = useState(null);
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optionsByLane, setOptionsByLane] = useState({});
  const [radius, setRadius] = useState(100);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      const { data, error } = await supabase
        .from('lanes')
        .select('id,origin_city,origin_state,destination_city,destination_state,status,created_at')
        .eq('status','pending')
        .order('created_at',{ ascending:false });
      if (!error && Array.isArray(data)) setLanes(data);
      setLoading(false);
    })();
  }, []);

  const userId = user?.id;
  const headers = useMemo(() => ({ 'Content-Type':'application/json', ...(userId ? { 'x-rr-user-id': userId } : {}) }), [userId]);

  async function loadOptionsForLane(lane) {
    setOptionsByLane(prev => ({ ...prev, [lane.id]: { loading:true } }));
    try {
      const body = { originCity: lane.origin_city, originState: lane.origin_state, destCity: lane.destination_city, destState: lane.destination_state, radiusMiles: radius };
      const res = await fetch('/api/post-options', { method:'POST', headers, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Failed');
      setOptionsByLane(prev => ({
        ...prev,
        [lane.id]: { originOptions: json.originOptions, destOptions: json.destOptions, status: { originSaved:false, destSaved:false } }
      }));
    } catch (e) {
      setOptionsByLane(prev => ({ ...prev, [lane.id]: { error: e.message } }));
    }
  }

  async function saveChoice(lane, type, opt) {
    if (!userId) return alert('Not authenticated');
    const payload = { laneId: lane.id, type, chosenCity: opt.city, chosenState: opt.state, chosenZip3: opt.zip3, chosenKma: opt.kma, distanceMiles: opt.miles };
    const res = await fetch('/api/save-override', { method:'POST', headers, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!json?.success) return alert(json?.error || 'Save failed');
    setOptionsByLane(prev => {
      const existing = prev[lane.id];
      const status = existing?.status || {};
      if (type==='origin') status.originSaved = true; else status.destSaved = true;
      return { ...prev, [lane.id]: { ...existing, status } };
    });
  }

  if (loading) return <Wrap><h1>Post Options</h1><p>Loading…</p></Wrap>;

  return (
    <Wrap>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-100">Post Options</h1>
        <Link href="/lanes" className="text-sm text-blue-400 hover:underline">← Back to Lanes</Link>
      </div>
      <p className="text-sm text-gray-300 mb-4">Pick actual posting cities for each pending lane. These selections are saved and can drive later pairing/export logic.</p>
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm text-gray-300">Radius (miles)</label>
        <input type="number" min={10} max={300} value={radius} onChange={e=>setRadius(Number(e.target.value)||100)} className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-100 text-sm" />
      </div>
      {lanes.length === 0 && <p className="text-gray-400">No pending lanes.</p>}
      <div className="flex flex-col gap-6">
        {lanes.map(lane => {
          const state = optionsByLane[lane.id];
          return (
            <div key={lane.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="text-gray-100 font-medium">{lane.origin_city}, {lane.origin_state} → {lane.destination_city}, {lane.destination_state}</div>
                <div className="flex gap-2">
                  <button onClick={()=>loadOptionsForLane(lane)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm">{state?.originOptions ? 'Reload' : 'Load Options'}</button>
                </div>
              </div>
              {state?.error && <div className="text-sm text-red-400">⚠ {state.error}</div>}
              {state?.loading && <div className="text-sm text-gray-400">Loading nearby cities…</div>}
              {state?.originOptions && (
                <div className="grid md:grid-cols-2 gap-4">
                  <SideTable title={`Pickup near ${lane.origin_city}, ${lane.origin_state}`} rows={state.originOptions} saved={state?.status?.originSaved} onChoose={opt=>saveChoice(lane,'origin',opt)} />
                  <SideTable title={`Delivery near ${lane.destination_city}, ${lane.destination_state}`} rows={state.destOptions} saved={state?.status?.destSaved} onChoose={opt=>saveChoice(lane,'destination',opt)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Wrap>
  );
}

function SideTable({ title, rows, saved, onChoose }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
        {saved && <span className="text-xs text-green-400 font-medium">Saved ✓</span>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400">
            <th className="py-1 text-left font-medium">City</th>
            <th className="py-1 text-left font-medium">St</th>
            <th className="py-1 text-left font-medium">KMA</th>
            <th className="py-1 text-left font-medium">Mi</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {rows?.map((r,i)=>(
            <tr key={i} className="border-t border-gray-800">
              <td className="py-1 pr-2 text-gray-200">{r.city}</td>
              <td className="py-1 pr-2 text-gray-300">{r.state}</td>
              <td className="py-1 pr-2 text-gray-400">{r.kma || '—'}</td>
              <td className="py-1 pr-2 text-gray-400">{r.miles ?? '—'}</td>
              <td className="py-1 text-right">
                <button disabled={saved} onClick={()=>onChoose(r)} className={`px-2 py-1 rounded text-xs ${saved ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>Choose</button>
              </td>
            </tr>
          ))}
          {(!rows || rows.length===0) && <tr><td colSpan={5} className="py-2 text-gray-500">No nearby cities.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Wrap({ children }) {
  return <div className="max-w-6xl mx-auto p-6 text-gray-100">{children}</div>;
}