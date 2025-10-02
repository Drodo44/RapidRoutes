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
  const [selectedCities, setSelectedCities] = useState({}); // { laneId: { origin: [...cities], dest: [...cities] } }

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
        const selectFields = 'id,origin_city,origin_state,destination_city,destination_state,origin_latitude,origin_longitude,dest_latitude,dest_longitude,lane_status,created_at,dest_city,dest_state';
        const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
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
            return data2.map(row => ({ ...row }));
          }
        } catch (e) {
          console.error('lane_status fetch error', e);
        }
        return [];
      }

      const pending = await fetchPendingLanes();
      console.log('[INITIAL LOAD] Fetched pending lanes:', pending.length);
      setLanes(pending);
      
      // AUTO-ENRICH: Immediately load city options for all pending lanes
      if (pending.length > 0) {
        console.log('[AUTO-ENRICH] Loading city options for', pending.length, 'lanes');
        setLoadingAll(true);
        
        try {
          const resp = await fetch('/api/quick-enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lanes: pending })
          });
          
          if (resp.ok) {
            const data = await resp.json();
            if (data.ok && data.lanes) {
              // Update lanes with city options
              const enrichedLanes = pending.map(lane => {
                const enriched = data.lanes.find(e => e.id === lane.id);
                if (enriched) {
                  return {
                    ...lane,
                    enriched: true,
                    origin_nearby: enriched.origin_nearby || [],
                    dest_nearby: enriched.dest_nearby || [],
                    origin_kmas: enriched.origin_kmas || {},
                    dest_kmas: enriched.dest_kmas || {}
                  };
                }
                return lane;
              });
              setLanes(enrichedLanes);
              console.log('[AUTO-ENRICH] Success! Enriched', data.count, 'lanes');
            }
          }
        } catch (error) {
          console.error('[AUTO-ENRICH] Error:', error);
        } finally {
          setLoadingAll(false);
        }
      }
      
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
      setGenMessage(`✅ Generated ${generated.length} lanes! → Click purple "Enrich Generated Lanes" button next`);
      
      // Auto-scroll to first generated card after DOM update
      setTimeout(() => {
        const firstGenCard = document.querySelector('[data-card-id^="gen_"]');
        if (firstGenCard) {
          firstGenCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log('[Generate All] Auto-scrolled to first generated card');
        }
      }, 100);
    } catch (err) {
      console.error('[Generate All] Error:', err);
      setGenError(`Unexpected error: ${err.message}`);
    } finally {
      setLoadingAll(false);
    }
  };

  // NEW: Quick city picker from pre-computed database
  const handleBatchIngest = async () => {
    console.log('[Quick Enrich] Starting instant city fetch from database');
    setGenError('');
    setGenMessage('');
    setLoadingAll(true);
    
    try {
      const generated = lanes.filter(l => String(l.id).startsWith('gen_'));
      if (generated.length === 0) {
        setGenError('No generated lanes to process');
        setLoadingAll(false);
        return;
      }
      
      setGenMessage(`⏳ Fetching cities for ${generated.length} lanes...`);
      
      // Call new fast API
      const resp = await fetch('/api/quick-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lanes: generated })
      });
      
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      
      const data = await resp.json();
      console.log('[Quick Enrich] Got enriched data:', data);
      
      if (data.ok && data.lanes) {
        // Update lanes with nearby cities
        setLanes(prev => prev.map(lane => {
          const enriched = data.lanes.find(e => e.id === lane.id);
          if (enriched) {
            return {
              ...lane,
              enriched: true,
              origin_nearby: enriched.origin_nearby || [],
              dest_nearby: enriched.dest_nearby || [],
              origin_kmas: enriched.origin_kmas || {},
              dest_kmas: enriched.dest_kmas || {}
            };
          }
          return lane;
        }));
        
        setGenMessage(`✅ ${data.count} lanes enriched! Cities loaded from database.`);
      }
      
    } catch (error) {
      console.error('[Quick Enrich] Error:', error);
      setGenError(`Failed: ${error.message}`);
    } finally {
      setLoadingAll(false);
    }
  };

  // Toggle city selection
  const toggleCitySelection = (laneId, type, city) => {
    setSelectedCities(prev => {
      const lane = prev[laneId] || { origin: [], dest: [] };
      const list = lane[type] || [];
      const exists = list.find(c => c.city === city.city && c.state_or_province === city.state_or_province);
      
      return {
        ...prev,
        [laneId]: {
          ...lane,
          [type]: exists 
            ? list.filter(c => !(c.city === city.city && c.state_or_province === city.state_or_province))
            : [...list, city]
        }
      };
    });
  };

  // Save city choices to database
  const saveCityChoices = async (lane) => {
    const selections = selectedCities[lane.id];
    if (!selections || (selections.origin.length === 0 && selections.dest.length === 0)) {
      alert('Please select at least one city');
      return;
    }

    try {
      const response = await fetch('/api/save-city-choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lane_id: lane.id,
          origin_city: lane.origin_city,
          origin_state: lane.origin_state,
          dest_city: lane.destination_city,
          dest_state: lane.destination_state,
          origin_chosen_cities: selections.origin,
          dest_chosen_cities: selections.dest
        })
      });

      const data = await response.json();
      if (data.ok) {
        alert(`✅ Saved! RR Number: ${data.rr_number}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Failed to save: ${error.message}`);
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

  if (loading) return <Wrap><h1>Post Options</h1><p>Loading pending lanes...</p></Wrap>;

  return (
    <Wrap>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-100">Post Options - Select Cities</h1>
        <Link href="/lanes" className="text-sm text-blue-400 hover:underline">← Back to Lanes</Link>
      </div>
      <p className="text-sm text-gray-300 mb-4">
        Select pickup and delivery cities for each pending lane. Cities are automatically loaded from your database.
        {loadingAll && <span className="ml-2 text-yellow-400">⏳ Loading city options...</span>}
        {!loadingAll && lanes.length > 0 && <span className="ml-2 text-green-400">✓ {lanes.length} lanes ready</span>}
      </p>
      {lanes.length === 0 && <p className="text-gray-400">No pending lanes.</p>}
      <div className="flex flex-col gap-6">
        {lanes.map((lane) => {
          const hasEnrichment = lane.enriched && (lane.origin_kmas || lane.dest_kmas);
          
          return (
            <div 
              key={lane.id} 
              className="rounded-lg p-4 bg-gray-800 border border-gray-700"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="text-gray-100 font-medium">
                  {lane.origin_city}, {lane.origin_state} → {lane.destination_city || lane.dest_city}, {lane.destination_state || lane.dest_state}
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
              {/* NEW: Show enriched cities with checkboxes */}
              {lane.enriched && (lane.origin_nearby || lane.dest_nearby) && (
                <>
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    {/* Origin Cities */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <h3 className="text-sm font-semibold text-gray-200 mb-2">
                        Pickup near {lane.origin_city}, {lane.origin_state}
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(lane.origin_kmas || {}).map(([kma, cities]) => (
                          <div key={kma} className="mb-3">
                            <div className="text-xs font-bold text-blue-400 mb-1">{kma} ({cities.length})</div>
                            {cities.slice(0, 20).map((city, i) => {
                              const isSelected = selectedCities[lane.id]?.origin?.find(
                                c => c.city === city.city && c.state_or_province === city.state_or_province
                              );
                              return (
                                <label key={i} className="flex items-center gap-2 text-sm text-gray-300 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="form-checkbox text-blue-600"
                                    checked={!!isSelected}
                                    onChange={() => toggleCitySelection(lane.id, 'origin', city)}
                                  />
                                  <span>{city.city}, {city.state_or_province}</span>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Destination Cities */}
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <h3 className="text-sm font-semibold text-gray-200 mb-2">
                        Delivery near {lane.destination_city}, {lane.destination_state}
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {Object.entries(lane.dest_kmas || {}).map(([kma, cities]) => (
                          <div key={kma} className="mb-3">
                            <div className="text-xs font-bold text-green-400 mb-1">{kma} ({cities.length})</div>
                            {cities.slice(0, 20).map((city, i) => {
                              const isSelected = selectedCities[lane.id]?.dest?.find(
                                c => c.city === city.city && c.state_or_province === city.state_or_province
                              );
                              return (
                                <label key={i} className="flex items-center gap-2 text-sm text-gray-300 hover:bg-gray-800 px-2 py-1 rounded cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="form-checkbox text-green-600"
                                    checked={!!isSelected}
                                    onChange={() => toggleCitySelection(lane.id, 'dest', city)}
                                  />
                                  <span>{city.city}, {city.state_or_province}</span>
                                </label>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() => saveCityChoices(lane)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-medium"
                    >
                      💾 Save City Choices
                    </button>
                    <span className="text-xs text-gray-400">
                      Selected: {selectedCities[lane.id]?.origin?.length || 0} origin, {selectedCities[lane.id]?.dest?.length || 0} destination
                    </span>
                  </div>
                </>
              )}
              
              {/* OLD: Original options table (still works for non-enriched lanes) */}
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