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
  const [loadingAll, setLoadingAll] = useState(false);
  const [masterLoaded, setMasterLoaded] = useState(false);
  const [genError, setGenError] = useState('');
  const [genMessage, setGenMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);

      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      async function fetchPendingLanes() {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          console.error('Missing Supabase env vars');
          return [];
        }
        const base = `${SUPABASE_URL}/rest/v1/lanes`;
        // Removed deprecated 'status' column from selection – schema now uses lane_status only
  // Updated select fields: use dest_latitude/dest_longitude (new schema) and lane_status only
  const selectFields = 'id,origin_city,origin_state,destination_city,destination_state,origin_latitude,origin_longitude,dest_latitude,dest_longitude,lane_status,created_at,dest_city,dest_state';
        const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
        // Single attempt: filter using lane_status only
        const url2 = `${base}?select=${encodeURIComponent(selectFields)}&lane_status=eq.pending&order=created_at.desc`;
        try {
          const r2 = await fetch(url2, { headers });
          if (!r2.ok) {
            const text = await r2.text().catch(()=> '');
            console.error('Failed to load lanes', r2.status, text);
            return [];
          }
          const data2 = await r2.json();
          if (Array.isArray(data2)) {
            // Normalize lane objects: expose only lane_status (no legacy status)
            return data2.map(row => ({ ...row }));
          }
        } catch (e) {
          console.error('lane_status fetch error', e);
        }
        return [];
      }

      const pending = await fetchPendingLanes();
      setLanes(pending);
      setLoading(false);
    })();
  }, []);

  const userId = user?.id;
  const headers = useMemo(() => ({ 'Content-Type':'application/json', ...(userId ? { 'x-rr-user-id': userId } : {}) }), [userId]);

  async function loadOptionsForLane(lane) {
    setOptionsByLane(prev => ({ ...prev, [lane.id]: { ...(prev[lane.id]||{}), loading:true, error: undefined } }));
    try {
      if (typeof lane.origin_latitude !== 'number' || typeof lane.origin_longitude !== 'number') {
        throw new Error('Missing origin coordinates on lane');
      }
      const payload = { lanes: [{ id: lane.id, origin_latitude: lane.origin_latitude, origin_longitude: lane.origin_longitude }] };
      console.log('🔼 Requesting post-options (single)', payload);
      const res = await fetch('/api/post-options', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(userId ? { 'x-rr-user-id': userId } : {}) },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      console.log('✅ Single lane response', json);
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      const result = Array.isArray(json?.results) ? json.results.find(r => r.laneId === lane.id) : null;
      if (!result) throw new Error('No result returned for lane');
      if (result.error) throw new Error(result.error);
      setOptionsByLane(prev => ({
        ...prev,
        [lane.id]: {
          originOptions: result.options || [],
          // Destination options not yet provided by API; placeholder empty array
          destOptions: prev[lane.id]?.destOptions || [],
          status: prev[lane.id]?.status || { originSaved:false, destSaved:false },
          loadedAt: Date.now(),
          source: result.source
        }
      }));
    } catch (e) {
      setOptionsByLane(prev => ({ ...prev, [lane.id]: { ...(prev[lane.id]||{}), error: e.message } }));
    } finally {
      setOptionsByLane(prev => ({ ...prev, [lane.id]: { ...(prev[lane.id]||{}), loading:false } }));
    }
  }

  // Enterprise Generate All: core_pickups + pending lanes fallback
  const handleGenerateAll = async () => {
    console.log('[Generate All] === BUTTON CLICKED ===', { timestamp: new Date().toISOString() });
    setGenError('');
    setGenMessage('');
    setLoadingAll(true);
    setGenMessage('⏳ Requesting generation from server...');
    try {
      console.log('[Generate All] Starting fetch to /api/generateAll...');
      const startTime = Date.now();
      const res = await fetch('/api/generateAll', { method: 'POST' });
      const elapsed = Date.now() - startTime;
      console.log('[Generate All] Response received:', { status: res.status, statusText: res.statusText, elapsed: elapsed + 'ms' });
      
      if (!res.ok) {
        const body = await res.text();
        console.error('[Generate All] Failed:', body);
        setGenError(`Failed to generate all lanes: ${res.status} ${res.statusText}`);
        return;
      }
      
      const { lanes: generated, counts } = await res.json();
      console.log('[Generate All] Success:', { generated: generated?.length, counts });
      console.log('[Generate All] Sample generated lane:', generated?.[0]);
      console.log('[Generate All] All generated lanes:', generated);
      
      // Strategy: merge generated (without IDs) into local list for option loading.
      // Provide synthetic IDs to avoid key collisions when feeding into existing loaders.
      const synthetic = generated.map((g, idx) => ({ id: `gen_${idx}_${g.origin_zip5 || g.origin_zip || idx}`, ...g }));
      console.log('[Generate All] Synthetic lanes created:', synthetic.length);
      console.log('[Generate All] Sample synthetic lane:', synthetic[0]);
      
      setLanes(prev => {
        console.log('[Generate All] Previous lanes count:', prev.length);
        // Keep existing pending lanes (with real IDs) and append synthetic seeds.
        const existingSyntheticIds = new Set(prev.filter(p => String(p.id).startsWith('gen_')).map(p => p.id));
        const newOnes = synthetic.filter(s => !existingSyntheticIds.has(s.id));
        console.log('[Generate All] New lanes to add:', newOnes.length);
        const updated = [...prev, ...newOnes];
        console.log('[Generate All] Updated lanes count:', updated.length);
        return updated;
      });
      setGenMessage(`✅ Generated ${generated.length} origin seeds (core: ${counts?.pickups ?? 0}, fallback: ${counts?.fallback ?? 0})`);
    } catch (err) {
      console.error('[Generate All] Error:', err);
      setGenError(`Unexpected error: ${err.message}`);
    } finally {
      setLoadingAll(false);
    }
  };

  // Chunked batch ingest to /api/post-options (new batch mode) for synthetic lanes
  const handleBatchIngest = async () => {
    console.log('[Batch Ingest] === BUTTON CLICKED ===', { timestamp: new Date().toISOString() });
    console.log('[Batch Ingest] Total lanes in state:', lanes.length);
    console.log('[Batch Ingest] Sample lane:', lanes[0]);
    setGenError('');
    setGenMessage('');
    setLoadingAll(true);
    try {
      const generated = lanes.filter(l => String(l.id).startsWith('gen_'));
      console.log('[Batch Ingest] Filtered generated lanes:', generated.length);
      console.log('[Batch Ingest] Sample generated lane:', generated[0]);
      if (generated.length === 0) {
        setGenError('No generated lanes to ingest');
        return;
      }
      const CHUNK = 20;
      let succeeded = 0; let totalFailed = 0; let processed = 0;
      const failedLanes = []; // track failed lanes for retry

      // First pass: process all chunks
      for (let i = 0; i < generated.length; i += CHUNK) {
        const slice = generated.slice(i, i + CHUNK);
        console.log(`[Batch Ingest] Processing chunk ${Math.floor(i/CHUNK)+1}/${Math.ceil(generated.length/CHUNK)}`, { sliceLength: slice.length });
        console.log(`[Batch Ingest] Chunk sample:`, slice[0]);
        try {
          console.log(`[Batch Ingest] Sending POST to /api/post-options...`);
          const startTime = Date.now();
          const resp = await fetch('/api/post-options', {
            method: 'POST',
            headers: { 'Content-Type':'application/json' },
            body: JSON.stringify({ lanes: slice })
          });
          const elapsed = Date.now() - startTime;
          console.log(`[Batch Ingest] Response received:`, { status: resp.status, ok: resp.ok, elapsed: elapsed + 'ms' });
          
          if (!resp.ok) {
            const errorText = await resp.text();
            console.error(`[Batch Ingest] HTTP error:`, { status: resp.status, body: errorText });
            throw new Error(`HTTP ${resp.status}`);
          }
          const json = await resp.json();
          console.log(`[Batch Ingest] Response JSON:`, json);
          if (!json.ok) throw new Error(json.error || 'Batch response error');
          
          succeeded += json.success || 0;
          totalFailed += json.failed || 0;
          processed = Math.min(i + slice.length, generated.length);
          
          // Track individual failures
          if (json.results && Array.isArray(json.results)) {
            const chunkFailed = json.results.filter(r => r.status === 'failed');
            failedLanes.push(...chunkFailed.map(r => slice.find(l => (l.id || `${l.origin_city}-${l.dest_city}`) === r.laneId)));
          }
          
          setGenMessage(`⏳ Chunk ${Math.floor(i/CHUNK)+1}/${Math.ceil(generated.length/CHUNK)}: ${succeeded} succeeded, ${totalFailed} failed`);
          console.log(`[Ingest] Chunk ${Math.floor(i/CHUNK)+1} result:`, json);
        } catch (e) {
          console.error(`[Ingest] Chunk ${Math.floor(i/CHUNK)} error:`, e.message);
          totalFailed += slice.length;
          failedLanes.push(...slice);
          setGenMessage(`⚠️ Chunk ${Math.floor(i/CHUNK)+1} failed: ${e.message}`);
        }
      }

      // Retry failed lanes once with exponential backoff
      if (failedLanes.length > 0) {
        setGenMessage(`🔄 Retrying ${failedLanes.length} failed lanes...`);
        await new Promise(r => setTimeout(r, 1500)); // 1.5s backoff
        
        let retrySucceeded = 0;
        for (let i = 0; i < failedLanes.length; i += CHUNK) {
          const retrySlice = failedLanes.slice(i, i + CHUNK).filter(Boolean);
          if (retrySlice.length === 0) continue;
          
          try {
            const resp = await fetch('/api/post-options', {
              method: 'POST',
              headers: { 'Content-Type':'application/json' },
              body: JSON.stringify({ lanes: retrySlice })
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const json = await resp.json();
            if (json.ok && json.success) {
              retrySucceeded += json.success;
              succeeded += json.success;
              totalFailed -= json.success;
            }
            console.log(`[Retry] Chunk ${Math.floor(i/CHUNK)+1} result:`, json);
          } catch (e) {
            console.error(`[Retry] Chunk ${Math.floor(i/CHUNK)} still failed:`, e.message);
          }
        }
        
        if (retrySucceeded > 0) {
          setGenMessage(`✅ Retry recovered ${retrySucceeded} lanes`);
        }
      }

      setGenMessage(`🎯 Ingest complete: ${succeeded} succeeded, ${totalFailed} failed`);
    } catch (err) {
      console.error('Batch ingest error:', err);
      setGenError('Batch ingest failed');
    } finally {
      setLoadingAll(false);
    }
  };

  async function loadAllPostOptions() {
    if (loadingAll) return;
    setLoadingAll(true);
    setMasterLoaded(false);
    const validLanes = lanes.filter(l => typeof l.origin_latitude === 'number' && typeof l.origin_longitude === 'number');
    if (validLanes.length === 0) {
      setLoadingAll(false);
      return;
    }
    const payload = { lanes: validLanes.map(l => ({ id: l.id, origin_latitude: l.origin_latitude, origin_longitude: l.origin_longitude })) };
    console.log('🔼 Batch request payload', payload);
    try {
      const res = await fetch('/api/post-options', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', ...(userId ? { 'x-rr-user-id': userId } : {}) },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(()=>({}));
      console.log('✅ Batch response', json);
      if (!res.ok) throw new Error(json?.error || `Batch failed (${res.status})`);
      const byId = {};
      (json.results || []).forEach(r => {
        if (r.error) {
          byId[r.laneId] = { error: r.error };
        } else {
          byId[r.laneId] = {
            originOptions: r.options || [],
            destOptions: [],
            status: { originSaved:false, destSaved:false },
            loadedAt: Date.now(),
            source: r.source
          };
        }
      });
      setOptionsByLane(prev => ({ ...prev, ...byId }));
      setMasterLoaded(true);
    } catch (e) {
      console.error('❌ Failed batch load', e);
    } finally {
      setLoadingAll(false);
    }
  }

  async function loadAllOptions() {
    if (loadingAll) return;
    setLoadingAll(true);
    setMasterLoaded(false);
    const batchSize = 3; // throttle size
    for (let i = 0; i < lanes.length; i += batchSize) {
      const batch = lanes.slice(i, i + batchSize);
      await Promise.all(batch.map(l => loadOptionsForLane(l)));
      // 300ms delay between batches to reduce HERE/API pressure
      if (i + batchSize < lanes.length) {
        await new Promise(r => setTimeout(r, 300));
      }
    }
    setMasterLoaded(true);
    setLoadingAll(false);
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
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm text-gray-300">Radius (miles)</label>
        <input type="number" min={10} max={300} value={radius} onChange={e=>setRadius(Number(e.target.value)||100)} className="w-24 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-100 text-sm" />
        <button
          onClick={loadAllPostOptions}
          disabled={loadingAll || lanes.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium"
        >
          {loadingAll ? 'Loading All…' : `Load All Options (${lanes.length})`}
        </button>
        <button
          onClick={handleGenerateAll}
          disabled={loadingAll}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium"
        >
          {loadingAll ? 'Generating…' : 'Generate All'}
        </button>
        <button
          onClick={handleBatchIngest}
          disabled={loadingAll}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium"
        >
          {loadingAll ? 'Processing…' : 'Ingest Generated'}
        </button>
        {masterLoaded && <span className="text-xs text-green-400">All lanes loaded ✓</span>}
      </div>
      {(genError || genMessage) && (
        <div className="mb-4 text-sm">
          {genError && <div className="text-red-400">⚠ {genError}</div>}
          {genMessage && <div className="text-green-400">{genMessage}</div>}
        </div>
      )}
      {lanes.length === 0 && <p className="text-gray-400">No pending lanes.</p>}
      <div className="flex flex-col gap-6">
        {(() => {
          console.log('[Render] Rendering lane cards, lanes.length:', lanes.length);
          console.log('[Render] Sample lane IDs:', lanes.slice(0, 5).map(l => l.id));
          return lanes.map(lane => {
            const state = optionsByLane[lane.id];
            const hasCoords = typeof lane.origin_latitude === 'number' && typeof lane.origin_longitude === 'number';
            const needsEnrichment = !hasCoords && String(lane.id).startsWith('gen_');
            return (
              <div key={lane.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="text-gray-100 font-medium">
                  {lane.origin_city}, {lane.origin_state} → {lane.destination_city || '(generated)'}, {lane.destination_state || ''}
                  {needsEnrichment && <span className="ml-2 text-xs text-yellow-400">⚠ Needs enrichment</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={()=>loadOptionsForLane(lane)}
                    disabled={loadingAll || !hasCoords}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm"
                    title={!hasCoords ? 'Click "Ingest Generated" first to enrich coordinates' : ''}
                  >
                    {state?.originOptions ? (loadingAll ? 'Loaded' : 'Reload') : 'Load Options'}
                  </button>
                </div>
              </div>
              {state?.error && <div className="text-sm text-red-400">⚠ {state.error}</div>}
              {state?.loading && <div className="text-sm text-gray-400 animate-pulse">Loading nearby cities…</div>}
              {state?.originOptions && (
                <div className="grid md:grid-cols-2 gap-4">
                  <SideTable title={`Pickup near ${lane.origin_city}, ${lane.origin_state}`} rows={state.originOptions} saved={state?.status?.originSaved} onChoose={opt=>saveChoice(lane,'origin',opt)} />
                  <SideTable title={`Delivery near ${lane.destination_city}, ${lane.destination_state}`} rows={state.destOptions} saved={state?.status?.destSaved} onChoose={opt=>saveChoice(lane,'destination',opt)} />
                </div>
              )}
            </div>
          );
        });
        })()}
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