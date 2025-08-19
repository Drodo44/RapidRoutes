// pages/recap.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function matches(q, l){
  if (!q) return true;
  const s = q.toLowerCase();
  return `${l.origin_city}, ${l.origin_state}`.toLowerCase().includes(s)
    || `${l.dest_city}, ${l.dest_state}`.toLowerCase().includes(s)
    || String(l.equipment_code).toLowerCase().includes(s);
}

export default function RecapPage(){
  const [q, setQ] = useState(''); const [lanes, setLanes] = useState([]);
  useEffect(()=>{ supabase.from('lanes').select('*').in('status',['pending','posted']).order('created_at',{ascending:false}).limit(200).then(({data})=>setLanes(data||[])); }, []);
  const filtered = useMemo(()=> (lanes||[]).filter(l=>matches(q,l)), [lanes,q]);

  function openExportView(){
    const ids = filtered.map(l=>l.id).join(',');
    window.open(`/recap-export?ids=${encodeURIComponent(ids)}`, '_blank');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-100">Recap</h1>
        <div className="flex gap-2">
          <input type="text" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search city, state, or equipment" className="w-64 inp" />
          <button onClick={openExportView} className="btn-secondary">Open Export View</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(l => (
          <article key={l.id} className="rounded-xl border border-gray-800 bg-[#0f1115] p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-100">
                {l.origin_city}, {l.origin_state} <span className="text-gray-500">→</span> {l.dest_city}, {l.dest_state}
              </div>
              <div className="text-xs text-gray-400">{l.status}</div>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              [{l.equipment_code} • {l.length_ft}ft] · {l.randomize_weight ? `${l.weight_min}-${l.weight_max} lbs` : `${l.weight_lbs} lbs`}
              <span className="ml-2">Pickup: {l.pickup_earliest} → {l.pickup_latest}</span>
            </div>
            {l.comment && <div className="text-xs text-gray-300 mt-2">Note: {l.comment}</div>}
          </article>
        ))}
      </div>
      {filtered.length===0 && <div className="text-sm text-gray-400">No active lanes match your search.</div>}

      <style jsx>{`
        .inp { @apply rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
        .btn-secondary { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800; }
      `}</style>
    </div>
  );
}
