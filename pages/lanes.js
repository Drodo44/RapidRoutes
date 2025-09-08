// pages/lanes.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import IntermodalNudge from '../components/IntermodalNudge';
import IntermodalEmailModal from '../components/IntermodalEmailModal';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { checkIntermodalEligibility } from '../lib/intermodalAdvisor';
import { generateReferenceId, generateNewReferenceId, getDisplayReferenceId } from '../lib/referenceIdUtils';
import Head from 'next/head';

function Section({ title, children, right, className = '' }) {
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

function LanesPage() {
  const router = useRouter();
  const { loading, isAuthenticated, session } = useAuth();
  
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
  const [posted, setPosted] = useState([]); 
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // Intermodal state
  const [showIntermodalNudge, setShowIntermodalNudge] = useState(false);
  const [showIntermodalEmail, setShowIntermodalEmail] = useState(false);
  const [intermodalLane, setIntermodalLane] = useState(null);
  const [editingLane, setEditingLane] = useState(null);

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
          <p className="text-lg">Loading Lanes...</p>
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

  function onPickOrigin(it) {
    setOrigin(`${it.city}, ${it.state}`);
    setOriginZip(it.zip || '');
  }

  function onPickDest(it) {
    setDest(`${it.city}, ${it.state}`);
    setDestZip(it.zip || '');
  }

  async function loadLists() {
    try {
      console.log('Loading lane lists...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw refreshError;
        if (!refreshed?.access_token) {
          throw new Error('Failed to authenticate. Please log in again.');
        }
      }
      
      const [{ data: p, error: pError }, { data: posted, error: postedError }, { data: r, error: rError }] = await Promise.all([
        supabase.from('lanes').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(200),
        supabase.from('lanes').select('*').eq('status', 'posted').order('created_at', { ascending: false }).limit(200),
        supabase.from('lanes').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      
      if (pError) throw pError;
      if (postedError) throw postedError;
      if (rError) throw rError;
      
      console.log('Lists loaded successfully:', {
        pending: p?.length || 0,
        posted: posted?.length || 0,
        recent: r?.length || 0
      });
      
      setPending(p || []); 
      setPosted(posted || []); 
      setRecent(r || []);
    } catch (error) {
      console.error('Failed to load lanes:', error);
      setPending([]); 
      setPosted([]); 
      setRecent([]);
      setMsg(`❌ Failed to load lanes: ${error.message}`);
    }
  }

  useEffect(() => {
    console.log('Initial load effect triggered');
    loadLists();
  }, []);

  // When user toggles randomize ON, open modal. Respect session memory
  useEffect(() => {
    if (randomize) {
      setRandOpen(true);
      const sMin = sessionStorage.getItem('rr_rand_min');
      const sMax = sessionStorage.getItem('rr_rand_max');
      if (sMin && sMax) {
        setRandMin(sMin);
        setRandMax(sMax);
      }
    }
  }, [randomize]);

  function validate() {
    if (!origin.includes(',') || !dest.includes(',')) return 'Choose Origin and Destination from the list.';
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

  async function submitLane(e) {
    e.preventDefault();
    setMsg('');
    const err = validate();
    if (err) {
      setMsg(err);
      return;
    }

    setBusy(true);
    try {
      const [oc, os] = origin.split(',').map(s => s.trim());
      const [dc, ds] = dest.split(',').map(s => s.trim());
      const payload = {
        origin_city: oc,
        origin_state: os,
        origin_zip: originZip || null,
        dest_city: dc,
        dest_state: ds,
        dest_zip: destZip || null,
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
      
      if (randomize && rememberSession) {
        sessionStorage.setItem('rr_rand_min', randMin);
        sessionStorage.setItem('rr_rand_max', randMax);
      }
      
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lane');
      }

      const newLane = await response.json();
      
      if (newLane) {
        const laneData = {
          origin_city: oc,
          origin_state: os,
          dest_city: dc,
          dest_state: ds,
          equipment_code: equipment.toUpperCase(),
          length_ft: Number(lengthFt),
          weight_lbs: randomize ? null : Number(weight)
        };
        
        const eligibilityCheck = await checkIntermodalEligibility(laneData);
        if (eligibilityCheck && eligibilityCheck.eligible === true) {
          setIntermodalLane(newLane);
          setShowIntermodalNudge(true);
        }
      }
      
      await loadLists();

      setMsg('✅ Lane added successfully');
      setOrigin(''); 
      setOriginZip(''); 
      setDest(''); 
      setDestZip('');
      setComment(''); 
      setCommodity('');
      setWeight(''); 
      setRandomize(false);
    } catch (error) {
      setMsg(error.message || 'Failed to save lane.');
    } finally {
      setBusy(false);
    }
  }

  async function postAgain(lane) {
    try {
      setMsg('Creating new lane based on successful posting...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }

      const payload = {
        origin_city: lane.origin_city,
        origin_state: lane.origin_state,
        origin_zip: lane.origin_zip || null,
        dest_city: lane.dest_city,
        dest_state: lane.dest_state,
        dest_zip: lane.dest_zip || null,
        equipment_code: lane.equipment_code,
        length_ft: lane.length_ft,
        full_partial: lane.full_partial || 'full',
        pickup_earliest: lane.pickup_earliest,
        pickup_latest: lane.pickup_latest,
        randomize_weight: !!lane.randomize_weight,
        weight_lbs: lane.weight_lbs || null,
        weight_min: lane.weight_min || null,
        weight_max: lane.weight_max || null,
        comment: lane.comment || null,
        commodity: lane.commodity || null,
        status: 'pending',
        reference_id: generateNewReferenceId()
      };

      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create new lane');
      }

      const newLane = await response.json();
      if (!newLane?.id) {
        throw new Error('Lane creation failed - missing lane ID');
      }

      await loadLists();
      setMsg(`✅ Successfully created new lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);

      try {
        const { data: { session: perfSession } } = await supabase.auth.getSession();
        if (perfSession?.access_token) {
          await fetch('/api/lane-performance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${perfSession.access_token}`
            },
            body: JSON.stringify({
              lane_id: newLane.id,
              equipment_code: lane.equipment_code,
              origin_city: lane.origin_city,
              origin_state: lane.origin_state,
              dest_city: lane.dest_city,
              dest_state: lane.dest_state,
              crawl_cities: [],
              intelligence_metadata: {
                repost_of_successful_lane: lane.id,
                original_success_date: lane.updated_at,
                intelligence_level: 'successful_repost'
              }
            })
          });
        }
      } catch (trackingError) {
        console.warn('Intelligence tracking error:', trackingError);
      }
    } catch (error) {
      console.error('Failed to create new lane:', error);
      setMsg(`❌ Failed to create new lane: ${error.message}`);
    }
  }

  async function delLane(lane) { 
    if (!confirm('Delete this lane?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch(`/api/lanes?id=${lane.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lane');
      }
      
      await loadLists();
    } catch (error) {
      alert(error.message);
    }
  }

  async function updateStatus(lane, status) {
    try {
      if (!session) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('/api/updateLaneStatus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ laneId: lane.id, status }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      await loadLists();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <Head>
        <title>Lane Management | RapidRoutes</title>
      </Head>
      
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Lane Management</h1>
          <p className="text-gray-400">Create and manage freight lanes for DAT posting</p>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-100">New Lane</h2>
          </div>
          <div className="p-4 bg-gray-900">
            <form onSubmit={submitLane} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CityAutocomplete id="origin" label="Origin (City, ST)" value={origin} onChange={setOrigin} onPick={onPickOrigin} />
              <CityAutocomplete id="dest" label="Destination (City, ST)" value={dest} onChange={setDest} onPick={onPickDest} />
              <EquipmentPicker code={equipment} onChange={setEquipment} />

              <div>
                <label className="block text-sm text-gray-300 mb-1">Full / Partial</label>
                <select value={fullPartial} onChange={(e) => setFullPartial(e.target.value)} className="inp">
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Length (ft)</label>
                <input type="number" min={1} value={lengthFt} onChange={(e) => setLengthFt(e.target.value)} className="inp" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Pickup Earliest</label>
                <input type="date" value={pickupEarliest} onChange={(e) => setPickupEarliest(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Pickup Latest</label>
                <input type="date" value={pickupLatest} onChange={(e) => setPickupLatest(e.target.value)} className="inp" />
              </div>

              {!randomize && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Weight (lbs)</label>
                  <input type="number" min={1} value={weight} onChange={(e) => setWeight(e.target.value)} className="inp" />
                </div>
              )}
              {randomize && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Random Min (lbs)</label>
                    <input type="number" min={1} value={randMin} onChange={(e) => setRandMin(e.target.value)} className="inp" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">Random Max (lbs)</label>
                    <input type="number" min={1} value={randMax} onChange={(e) => setRandMax(e.target.value)} className="inp" />
                  </div>
                </div>
              )}

              <div className="col-span-full flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} className="accent-gray-300" />
                  Randomize Weight
                </label>
              </div>

              <div className="col-span-full">
                <label className="block text-sm text-gray-300 mb-1">Comment (optional)</label>
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} className="inp" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Commodity (optional)</label>
                <input type="text" value={commodity} onChange={(e) => setCommodity(e.target.value)} className="inp" />
              </div>

              {msg && <div className="col-span-full text-sm text-gray-300">{msg}</div>}

              <div className="col-span-full flex items-center gap-4">
                <button type="submit" disabled={busy} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                  {busy ? 'Saving…' : 'Add Lane'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <Section
          title="Lanes"
          right={
            <div className="flex gap-2">
              <button className={`px-3 py-1 rounded-md ${tab === 'pending' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} onClick={() => setTab('pending')}>
                Pending
              </button>
              <button className={`px-3 py-1 rounded-md ${tab === 'posted' ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-green-700 hover:text-white'}`} onClick={() => setTab('posted')}>
                Active Postings
              </button>
              <button className={`px-3 py-1 rounded-md ${tab === 'recent' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} onClick={() => setTab('recent')}>
                Recent
              </button>
            </div>
          }
        >
          <div className="divide-y divide-gray-800">
            {(tab === 'pending' ? pending : tab === 'posted' ? posted : recent).map(l => (
              <div key={l.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 py-3">
                <div className="text-sm">
                  <div className="text-gray-100">
                    {(l.reference_id || getDisplayReferenceId(l)) && (
                      <span className="inline-block mr-3 px-2 py-0.5 text-xs font-mono font-bold rounded bg-green-900/60 text-green-200">
                        REF #{l.reference_id || getDisplayReferenceId(l)}
                      </span>
                    )}
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
                <div className="flex gap-2">
                  {l.status !== 'posted' && (
                    <button onClick={() => updateStatus(l, 'posted')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
                      Mark Posted
                    </button>
                  )}
                  {l.status === 'posted' && (
                    <button onClick={() => updateStatus(l, 'pending')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">
                      Unpost
                    </button>
                  )}
                  {l.status !== 'covered' && (
                    <button onClick={() => updateStatus(l, 'covered')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">
                      Mark Covered
                    </button>
                  )}
                  {l.status === 'covered' && (
                    <button onClick={() => postAgain(l)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                      🚀 Post Again
                    </button>
                  )}
                  <button onClick={() => delLane(l)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {(tab === 'pending' ? pending : tab === 'posted' ? posted : recent).length === 0 && (
              <div className="py-6 text-sm text-gray-400">No lanes in this category.</div>
            )}
          </div>
        </Section>

        {/* Intermodal Nudge Modal */}
        {showIntermodalNudge && (
          <IntermodalNudge
            lane={intermodalLane}
            onClose={() => setShowIntermodalNudge(false)}
            onEmail={(lane) => {
              setShowIntermodalNudge(false);
              setShowIntermodalEmail(true);
            }}
          />
        )}

        {/* Intermodal Email Modal */}
        {showIntermodalEmail && (
          <IntermodalEmailModal
            lane={intermodalLane}
            onClose={() => setShowIntermodalEmail(false)}
          />
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
    </>
  );
}

export default LanesPage;
