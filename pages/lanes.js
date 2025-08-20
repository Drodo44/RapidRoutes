// pages/lanes.js
import { useEffect, useState } from 'react';
import CityAutocomplete from '../components/CityAutocomplete';
import EquipmentPicker from '../components/EquipmentPicker';
import { supabase } from '../utils/supabaseClient';
import Head from 'next/head';

function Section({ title, children, right }) {
  return (
    <section className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden mb-8">
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
        {right}
      </div>
      <div className="p-4 bg-gray-900">{children}</div>
    </section>
  );
}

export default function LanesPage() {
  // Form state
  const [origin, setOrigin] = useState('');
  const [originZip, setOriginZip] = useState('');
  const [dest, setDest] = useState('');
  const [destZip, setDestZip] = useState('');
  const [equipment, setEquipment] = useState('');
  const [lengthFt, setLengthFt] = useState(48);
  const [fullPartial, setFullPartial] = useState('full');
  const [pickupEarliest, setPickupEarliest] = useState('');
  const [pickupLatest, setPickupLatest] = useState('');
  const [comment, setComment] = useState('');
  const [commodity, setCommodity] = useState('');

  // Weight
  const [randomize, setRandomize] = useState(false);
  const [randMin, setRandMin] = useState('');
  const [randMax, setRandMax] = useState('');
  const [weight, setWeight] = useState('');
  const [randOpen, setRandOpen] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);

  // Lists
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function onPickOrigin(it){ setOrigin(`${it.city}, ${it.state}`); setOriginZip(it.zip || ''); }
  function onPickDest(it){ setDest(`${it.city}, ${it.state}`); setDestZip(it.zip || ''); }

  async function loadLists(){
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('lanes').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
      supabase.from('lanes').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    setPending(p || []); setRecent(r || []);
  }
  useEffect(()=>{ loadLists(); }, []);

  // When user toggles randomize ON, open modal. Respect session memory
  useEffect(()=>{
    if (randomize) {
      setRandOpen(true);
      const sMin = sessionStorage.getItem('rr_rand_min');
      const sMax = sessionStorage.getItem('rr_rand_max');
      if (sMin && sMax) { setRandMin(sMin); setRandMax(sMax); }
    }
  }, [randomize]);

  function validate(){
    if (!origin.includes(',' ) || !dest.includes(',') ) return 'Choose Origin and Destination from the list.';
    if (!equipment) return 'Equipment is required.';
    if (!lengthFt || Number(lengthFt) <= 0) return 'Length must be > 0.';
    if (!pickupEarliest || !pickupLatest) return 'Pickup dates are required.';
    if (!randomize) {
      if (!weight || Number(weight) <= 0) return 'Weight is required when randomize is OFF.';
    } else {
      const mn = Number(randMin), mx = Number(randMax);
      if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn <= 0 || mx <= 0 || mn > mx) return 'Randomize range invalid.';
    }
    return null;
  }

  async function submitLane(e){
    e.preventDefault(); setMsg('');
    const err = validate(); if (err) { setMsg(err); return; }
    setBusy(true);
    try {
      const [oc, os] = origin.split(',').map(s=>s.trim());
      const [dc, ds] = dest.split(',').map(s=>s.trim());
      const payload = {
        origin_city: oc, origin_state: os, origin_zip: originZip || null,
        dest_city: dc,   dest_state: ds,   dest_zip: destZip || null,
        equipment_code: equipment.toUpperCase(),
        length_ft: Number(lengthFt),
        full_partial: fullPartial === 'partial' ? 'partial' : 'full',
        pickup_earliest: pickupEarliest,
        pickup_latest: pickupLatest,
        randomize_weight: !!randomize,
        weight_lbs: randomize ? null : Number(weight),
        weight_min: randomize ? Number(randMin) : null,
        weight_max: randomize ? Number(randMax) : null,
        comment: comment || null,
        commodity: commodity || null,
        status: 'pending',
      };
      const { error } = await supabase.from('lanes').insert([payload]);
      if (error) throw error;

      setMsg('Lane added.');
      setOrigin(''); setOriginZip(''); setDest(''); setDestZip('');
      setComment(''); setCommodity('');
      setWeight(''); setRandomize(false);
      await loadLists();
    } catch (e2) {
      setMsg(e2.message || 'Failed to save lane.');
    } finally { setBusy(false); }
  }

  function openCrawlPreview(l){
    const o = `${l.origin_city},${l.origin_state}`;
    const d = `${l.dest_city},${l.dest_state}`;
    const url = `/api/debugCrawl?origin=${encodeURIComponent(o)}&dest=${encodeURIComponent(d)}&equip=${encodeURIComponent(l.equipment_code)}&fill=0`;
    window.open(url, '_blank');
  }
  function perLaneExport(l, fill=false){
    window.open(`/api/exportLaneCsv?id=${encodeURIComponent(l.id)}&fill=${fill?'1':'0'}`, '_blank');
  }

  async function bulkExport({ fill }){
    try {
      const head = await fetch(`/api/exportDatCsv?pending=1&fill=${fill?'1':'0'}`, { method:'HEAD' });
      const total = Number(head.headers.get('X-Total-Parts') || '1');
      for (let i=1;i<=total;i++){
        const url = `/api/exportDatCsv?pending=1&fill=${fill?'1':'0'}&part=${i}`;
        const a = document.createElement('a'); a.href = url; a.download = ''; document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) { alert('Bulk export failed. ' + (e.message||'')); }
  }

  async function updateStatus(lane, status){ const { error } = await supabase.from('lanes').update({ status }).eq('id', lane.id); if (error) alert(error.message); else loadLists(); }
  async function delLane(lane){ if (!confirm('Delete this lane?')) return; const { error } = await supabase.from('lanes').delete().eq('id', lane.id); if (error) alert(error.message); else loadLists(); }

  return (
    <div className="space-y-8">
      <Section
        title="New Lane"
        right={
          <div className="flex gap-2">
            <button onClick={() => bulkExport({ fill:false })} className="btn-secondary">Export DAT CSV (Pending)</button>
            <button onClick={() => bulkExport({ fill:true })} className="btn-secondary">Export DAT CSV (Pending, Fill-to-10)</button>
          </div>
        }
      >
        <form onSubmit={submitLane} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CityAutocomplete id="origin" label="Origin (City, ST)" value={origin} onChange={setOrigin} onPick={(it)=>{ setOrigin(`${it.city}, ${it.state}`); setOriginZip(it.zip||''); }} />
          <CityAutocomplete id="dest"   label="Destination (City, ST)" value={dest}   onChange={setDest}   onPick={(it)=>{ setDest(`${it.city}, ${it.state}`);   setDestZip(it.zip||''); }} />
          <EquipmentPicker code={equipment} onChange={setEquipment} />

          <div>
            <label className="block text-sm text-gray-300 mb-1">Full / Partial</label>
            <select value={fullPartial} onChange={(e)=>setFullPartial(e.target.value)} className="inp">
              <option value="full">Full</option><option value="partial">Partial</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Length (ft)</label>
            <input type="number" min={1} value={lengthFt} onChange={(e)=>setLengthFt(e.target.value)} className="inp" />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Pickup Earliest</label>
            <input type="text" placeholder="8/19/2025" value={pickupEarliest} onChange={(e)=>setPickupEarliest(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Pickup Latest</label>
            <input type="text" placeholder="8/21/2025" value={pickupLatest} onChange={(e)=>setPickupLatest(e.target.value)} className="inp" />
          </div>

          {!randomize && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Weight (lbs)</label>
              <input type="number" min={1} value={weight} onChange={(e)=>setWeight(e.target.value)} className="inp" />
            </div>
          )}
          {randomize && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Random Min (lbs)</label>
                <input type="number" min={1} value={randMin} onChange={(e)=>setRandMin(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Random Max (lbs)</label>
                <input type="number" min={1} value={randMax} onChange={(e)=>setRandMax(e.target.value)} className="inp" />
              </div>
            </div>
          )}

          <div className="col-span-full flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={randomize} onChange={(e)=>setRandomize(e.target.checked)} className="accent-gray-300" />
              Randomize Weight
            </label>
            <button type="button" onClick={()=>setRandOpen(true)} className="btn-secondary">Set Range (Session)</button>
          </div>

          <div className="col-span-full">
            <label className="block text-sm text-gray-300 mb-1">Comment (optional)</label>
            {!comment && <div className="text-xs italic text-gray-400 mb-1">Reminder: DAT auto removes postings with any contact information in comments</div>}
            <input type="text" value={comment} onChange={(e)=>setComment(e.target.value)} className="inp" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Commodity (optional)</label>
            <input type="text" value={commodity} onChange={(e)=>setCommodity(e.target.value)} className="inp" />
          </div>

          {msg && <div className="col-span-full text-sm text-gray-300">{msg}</div>}

          <div className="col-span-full">
            <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Add Lane'}</button>
          </div>
        </form>
      </Section>

      <Section
        title="Lanes"
        right={
          <div className="flex gap-2">
            <button className={`tab ${tab==='pending'?'tab-active':''}`} onClick={()=>setTab('pending')}>Pending</button>
            <button className={`tab ${tab==='recent'?'tab-active':''}`}  onClick={()=>setTab('recent')}>Recent</button>
          </div>
        }
      >
        <div className="divide-y divide-gray-800">
          {(tab === 'pending' ? pending : recent).map(l => (
            <div key={l.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3">
              <div className="text-sm">
                <div className="text-gray-100">
                  <span className="font-medium">{l.origin_city}, {l.origin_state}</span>
                  <span className="mx-2 text-gray-500">→</span>
                  <span className="font-medium">{l.dest_city}, {l.dest_state}</span>
                  <span className="ml-2 text-gray-400">[{l.equipment_code} • {l.length_ft}ft]</span>
                </div>
                <div className="text-xs text-gray-400">
                  {l.randomize_weight ? `Weight: ${l.weight_min}-${l.weight_max} lbs` : `Weight: ${l.weight_lbs || '—'} lbs`}
                  <span className="ml-3">Pickup: {l.pickup_earliest} → {l.pickup_latest}</span>
                  {l.comment ? <span className="ml-3">Note: {l.comment}</span> : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>openCrawlPreview(l)} className="btn-secondary">Preview</button>
                <button onClick={()=>perLaneExport(l,false)} className="btn-secondary">Export</button>
                <button onClick={()=>perLaneExport(l,true)} className="btn-secondary">Export (Fill-to-10)</button>
                {l.status!=='posted' && <button onClick={()=>updateStatus(l,'posted')} className="btn-primary">Mark Posted</button>}
                {l.status==='posted' && <button onClick={()=>updateStatus(l,'pending')} className="btn-secondary">Unpost</button>}
                {l.status!=='covered' && <button onClick={()=>updateStatus(l,'covered')} className="btn-secondary">Mark Covered</button>}
                <button onClick={()=>delLane(l)} className="btn-danger">Delete</button>
              </div>
            </div>
          ))}
          {(tab === 'pending' ? pending : recent).length === 0 && (
            <div className="py-6 text-sm text-gray-400">No lanes yet.</div>
          )}
        </div>
      </Section>

      {/* Randomize modal */}
      {randOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-[#0f1115] p-4">
            <h3 className="text-gray-100 font-semibold mb-2">Weight Randomization</h3>
            <p className="text-sm text-gray-400 mb-3">Set a min/max. You can also remember this for all new lanes (this session).</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Min (lbs)</label>
                <input type="number" min={1} value={randMin} onChange={(e)=>setRandMin(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Max (lbs)</label>
                <input type="number" min={1} value={randMax} onChange={(e)=>setRandMax(e.target.value)} className="inp" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 mt-3">
              <input type="checkbox" checked={rememberSession} onChange={(e)=>setRememberSession(e.target.checked)} className="accent-gray-300" />
              Apply to all new lanes (this session)
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={()=>setRandOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={()=>{
                  if (rememberSession){ sessionStorage.setItem('rr_rand_min', String(randMin||'')); sessionStorage.setItem('rr_rand_max', String(randMax||'')); }
                  setRandOpen(false);
                }}
              >Apply</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inp { @apply w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500; }
        .btn-primary { @apply rounded-lg bg-gray-100 text-black font-medium px-4 py-2 hover:bg-white disabled:opacity-60; }
        .btn-secondary { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-200 hover:bg-gray-800; }
        .btn-danger { @apply rounded-lg border border-red-700 px-3 py-1.5 text-red-300 hover:bg-red-900/30; }
        .tab { @apply rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:text-white; }
        .tab-active { @apply bg-gray-800 text-white; }
      `}</style>
    </div>
  );
}
