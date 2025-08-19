// pages/dashboard.js
// Dashboard: Market Map (latest per equipment), Floor Space Calculator (inches),
// Heavy Haul Checker (oversize alerts + email fields).

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

function Section({ title, children, right }) {
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
    supabase
      .from('dat_maps')
      .select('id, created_at, effective_date, equipment, image_path, summary')
      .order('effective_date', { ascending: false })
      .limit(100)
      .then(({ data }) => setRows(data || []));
  }, []);
  // Group by equipment => most recent by effective_date
  return useMemo(() => {
    const out = { van: null, reefer: null, flatbed: null };
    for (const eq of ['van', 'reefer', 'flatbed']) {
      const found = rows.find((r) => r.equipment === eq);
      if (found) out[eq] = found;
    }
    return out;
  }, [rows]);
}

function publicUrl(path) {
  const { data } = supabase.storage.from('dat_maps').getPublicUrl(path);
  return data?.publicUrl || null;
}

export default function Dashboard() {
  const [equipTab, setEquipTab] = useState('van');
  const maps = useLatestMaps();

  // Floor Space (lengthwise fit)
  const [len, setLen] = useState(48); // pallet length inches
  const [wid, setWid] = useState(40);
  const [hei, setHei] = useState(48);
  const [count, setCount] = useState(1);
  const box26Len = 26 * 12; // 312"
  const dryVan53Len = 53 * 12; // 636"
  const totalLinear = Math.max(0, Number(len)) * Math.max(0, Number(count));
  const fits26 = totalLinear <= box26Len;
  const fits53 = totalLinear <= dryVan53Len;

  // Heavy Haul
  const [loadLen, setLoadLen] = useState(480); // inches
  const [loadWid, setLoadWid] = useState(102);
  const [loadHei, setLoadHei] = useState(102);
  const [loadWt, setLoadWt] = useState(46000);

  // Typical legal limits (generalized, varies by state — this is an at-a-glance checker)
  const legal = { len: 636, wid: 102, hei: 162, wt: 80000 }; // 53' length, 8'6" width, 13'6" height, gross 80k (truck+load)
  const oversize =
    loadLen > legal.len || loadWid > legal.wid || loadHei > legal.hei || loadWt > legal.wt;

  const [commodity, setCommodity] = useState('');
  const [val, setVal] = useState('');
  const [pDate, setPDate] = useState('');
  const [dDate, setDDate] = useState('');

  const mapRec = maps[equipTab];
  const mapUrl = mapRec ? publicUrl(mapRec.image_path) : null;

  return (
    <div className="space-y-8">
      <Section
        title="DAT Market Map"
        right={
          <div className="flex gap-2">
            {['van','reefer','flatbed'].map((t) => (
              <button key={t} className={`tab ${equipTab === t ? 'tab-active' : ''}`} onClick={() => setEquipTab(t)}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        }
      >
        {mapUrl ? (
          <figure className="space-y-2">
            <img src={mapUrl} alt={`${equipTab} DAT market map`} className="w-full rounded-lg border border-gray-800" />
            <figcaption className="text-xs text-gray-400">
              Sourced from DAT Blog — Updated Weekly. Effective {mapRec.effective_date}.
            </figcaption>
          </figure>
        ) : (
          <div className="text-sm text-gray-400">
            No map found for {equipTab}. Use Admin Upload or wait for the weekly fetch.
          </div>
        )}
      </Section>

      <Section title="Floor Space Calculator (Lengthwise Fit – inches)">
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="lbl">Pallet Length (in)</label>
            <input type="number" value={len} onChange={(e) => setLen(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Pallet Width (in)</label>
            <input type="number" value={wid} onChange={(e) => setWid(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Pallet Height (in)</label>
            <input type="number" value={hei} onChange={(e) => setHei(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Pallet Count</label>
            <input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="inp" />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-200">
              Linear need: <span className="font-mono">{Math.round(totalLinear)}″</span>
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <span className={`badge ${fits26 ? 'ok' : 'bad'}`}>26' Box Truck: {fits26 ? 'Fits' : 'Does NOT fit'}</span>
          <span className={`badge ${fits53 ? 'ok' : 'bad'} ml-2`}>53' Dry Van: {fits53 ? 'Fits' : 'Does NOT fit'}</span>
        </div>
      </Section>

      <Section title="Open Deck Dimensions Compliance Checker">
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="lbl">Length (in)</label>
            <input type="number" value={loadLen} onChange={(e) => setLoadLen(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Width (in)</label>
            <input type="number" value={loadWid} onChange={(e) => setLoadWid(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Height (in)</label>
            <input type="number" value={loadHei} onChange={(e) => setLoadHei(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Weight (lbs)</label>
            <input type="number" value={loadWt} onChange={(e) => setLoadWt(e.target.value)} className="inp" />
          </div>
        </div>
        <div className="mt-3 text-sm">
          {oversize ? (
            <div className="text-amber-300">
              Oversize/Overweight likely — consider permits / specialized equipment (RGN/Lowboy).
            </div>
          ) : (
            <div className="text-green-300">Within typical legal limits.</div>
          )}
        </div>

        <div className="mt-4 grid md:grid-cols-4 gap-3">
          <div>
            <label className="lbl">Commodity</label>
            <input type="text" value={commodity} onChange={(e) => setCommodity(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Load Value</label>
            <input type="text" value={val} onChange={(e) => setVal(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="lbl">Pickup Date</label>
            <input type="text" value={pDate} onChange={(e) => setPDate(e.target.value)} className="inp" placeholder="e.g., 8/20/2025" />
          </div>
          <div>
            <label className="lbl">Delivery Date</label>
            <input type="text" value={dDate} onChange={(e) => setDDate(e.target.value)} className="inp" placeholder="e.g., 8/22/2025" />
          </div>
        </div>

        <div className="mt-3">
          <details className="rounded-lg border border-gray-800 p-3">
            <summary className="cursor-pointer text-sm text-gray-200">Copy-ready email template</summary>
            <pre className="mt-2 text-xs text-gray-300 whitespace-pre-wrap">
Subject: Oversize/Open Deck Inquiry – {commodity || '(Commodity)'} – {pDate || '(Pickup Date)'} → {dDate || '(Delivery Date)'}
Body:
Hi Team,
We have an open-deck load with the following specs:
• Length: {loadLen}"  • Width: {loadWid}"  • Height: {loadHei}"  • Weight: {loadWt} lbs
• Commodity: {commodity || '(enter)'}  • Load Value: {val || '(enter)'}
Pickup: {pDate || '(enter)'}  • Delivery: {dDate || '(enter)'}
Please advise permits/equipment needs (RGN/Lowboy) and availability.
Thanks,
RapidRoutes
            </pre>
          </details>
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
