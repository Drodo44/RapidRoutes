// pages/dashboard.js
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function Section({ title, right, children }) {
  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        {right}
      </div>
      <div className="rounded-xl border border-gray-800 bg-[#0f1115] p-4">{children}</div>
    </section>
  );
}

function useLatestMaps() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    supabase.from('dat_maps').select('effective_date,equipment,image_path').order('effective_date', { ascending: false }).limit(100)
      .then(({ data }) => setRows(data || []));
  }, []);
  return useMemo(() => {
    const out = { van:null, reefer:null, flatbed:null };
    for (const eq of ['van','reefer','flatbed']) out[eq] = (rows || []).find(r => r.equipment === eq) || null;
    return out;
  }, [rows]);
}
function publicUrl(path){ const { data } = supabase.storage.from('dat_maps').getPublicUrl(path); return data?.publicUrl || null; }

export default function Dashboard() {
  const [tab, setTab] = useState('van');
  const maps = useLatestMaps();
  const rec = maps[tab];
  const mapUrl = rec ? publicUrl(rec.image_path) : null;

  // Floor-space (rows across)
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
  const [l,setL]=useState(480), [w,setW]=useState(102), [h,setH]=useState(102), [wt,setWt]=useState(46000);
  const legal = { len: 636, wid: 102, hei: 162, wt: 80000 };
  const oversize = l>legal.len || w>legal.wid || h>legal.hei || wt>legal.wt;

  return (
    <div className="space-y-8">
      <Section
        title="DAT Market Map"
        right={
          <div className="flex gap-2">
            {['van','reefer','flatbed'].map(k=>(
              <button key={k} onClick={()=>setTab(k)} className={`tab ${tab===k?'tab-active':''}`}>{k[0].toUpperCase()+k.slice(1)}</button>
            ))}
          </div>
        }
      >
        {mapUrl ? <img src={mapUrl} alt={`${tab} map`} className="w-full rounded-lg border border-gray-800"/> :
          <div className="text-sm text-gray-400">No map yet. Use Admin Upload or wait for the weekly fetch.</div>}
      </Section>

      <Section title="Floor Space Calculator (two-across rows)">
        <div className="grid md:grid-cols-5 gap-3">
          <div><label className="lbl">Pallet Length (in)</label><input className="inp" type="number" value={pLen} onChange={e=>setPLen(e.target.value)} /></div>
          <div><label className="lbl">Pallet Width (in)</label><input className="inp" type="number" value={pWid} onChange={e=>setPWid(e.target.value)} /></div>
          <div><label className="lbl">Pallet Count</label><input className="inp" type="number" value={count} onChange={e=>setCount(e.target.value)} /></div>
          <div className="flex items-end text-sm text-gray-200">Across per row: <span className="ml-1 font-mono">{across}</span></div>
          <div className="flex items-end text-sm text-gray-200">Rows @53′: <span className="ml-1 font-mono">{rows53}</span></div>
        </div>
        <div className="mt-3 text-sm">
          <span className={`badge ${fits26?'ok':'bad'}`}>26′ Box: {fits26 ? 'Fits' : `Needs ≤ ${cap26}`}</span>
          <span className={`badge ${fits53?'ok':'bad'} ml-2`}>53′ Van: {fits53 ? 'Fits' : `Needs ≤ ${cap53}`}</span>
        </div>
      </Section>

      <Section title="Open Deck Dimensions Checker">
        <div className="grid md:grid-cols-5 gap-3">
          <div><label className="lbl">Length (in)</label><input className="inp" type="number" value={l} onChange={e=>setL(e.target.value)} /></div>
          <div><label className="lbl">Width (in)</label><input className="inp" type="number" value={w} onChange={e=>setW(e.target.value)} /></div>
          <div><label className="lbl">Height (in)</label><input className="inp" type="number" value={h} onChange={e=>setH(e.target.value)} /></div>
          <div><label className="lbl">Weight (lbs)</label><input className="inp" type="number" value={wt} onChange={e=>setWt(e.target.value)} /></div>
        </div>
        <div className={`mt-3 text-sm ${oversize?'text-amber-300':'text-green-300'}`}>
          {oversize ? 'Oversize/Overweight likely — consider permits / RGN/Lowboy.' : 'Within typical legal limits.'}
        </div>
      </Section>

      <style jsx>{`
        .tab { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:text-white; }
        .tab-active { @apply bg-gray-800 text-white; }
        .lbl { @apply block text-sm text-gray-300 mb-1; }
        .inp { @apply w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
        .badge { @apply inline-block rounded-lg border border-gray-700 px-2 py-1 text-xs; }
        .badge.ok { @apply border-green-700 text-green-300; }
        .badge.bad { @apply border-red-700 text-red-300; }
      `}</style>
    </div>
  );
}
