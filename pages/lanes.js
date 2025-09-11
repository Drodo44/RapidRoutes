// pages/lanes.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import IntermodalNudge from '../components/IntermodalNudge';
import IntermodalEmailModal from '../components/IntermodalEmailModal';
import { supabase } from '../utils/supabaseClient';
// Removed direct import - now using API call for server-side intelligence generation
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
  // --- Restore submitLane function ---
  async function submitLane(e) {
    e.preventDefault();
    setMsg('');
    // Validate first
    const err = validate();
    if (err) {
      setMsg(err);
      return;
    }
    // Then get session
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      setMsg('Authentication required. Please log in again.');
      return;
    }
    setBusy(true);
    try {
      const [oc, os] = origin.split(',').map(s => s.trim());
      const [dc, ds] = dest.split(',').map(s => s.trim());
      // First check intermodal eligibility
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
      if (eligibilityCheck?.eligible) {
        setIntermodalLane(laneData);
        setPendingAction({ type: 'createLane', data: laneData });
        setShowIntermodalNudge(true);
        setBusy(false);
        return;
      }
      // If not intermodal eligible, continue with regular lane creation
      await createLaneFromData(laneData, authSession);
    } catch (error) {
      setMsg(error.message || 'Failed to save lane.');
    } finally {
      setBusy(false);
    }
  }
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
  const [tab, setTab] = useState('active');
  const [pending, setPending] = useState([]); // Now holds "Active" lanes (pending + posted)
  const [posted, setPosted] = useState([]);   // Now holds "Covered" lanes
  const [recent, setRecent] = useState([]);   // Now holds "Archived" lanes
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  // RR# Search state
  const [searchRR, setSearchRR] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Intermodal state
  const [showIntermodalNudge, setShowIntermodalNudge] = useState(false);
  const [showIntermodalEmail, setShowIntermodalEmail] = useState(false);
  const [intermodalLane, setIntermodalLane] = useState(null);
  const [editingLane, setEditingLane] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // Track what action to continue after intermodal check

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
      
      const [
        { data: active = [], error: activeError },
        { data: covered = [], error: coveredError },
        { data: archived = [], error: archivedError }
      ] = await Promise.all([
        supabase.from('lanes').select('*').in('status', ['pending', 'posted']).order('created_at', { ascending: false }).limit(200),
        supabase.from('lanes').select('*').eq('status', 'covered').order('created_at', { ascending: false }).limit(200),
        supabase.from('lanes').select('*').eq('status', 'archived').order('created_at', { ascending: false }).limit(50),
      ]);

      if (activeError) throw activeError;
      if (coveredError) throw coveredError;
      if (archivedError) throw archivedError;

      console.log('Lists loaded successfully:', {
        active: active.length,
        covered: covered.length,
        archived: archived.length
      });

      setPending(active);
      setPosted(covered);
      setRecent(archived);
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

  // Helper function to create lane from data without intermodal check
  async function createLaneFromData(laneData, authSession) {
    console.log('🚛 createLaneFromData called with:', laneData);
    console.log('🚛 Form state - originZip:', originZip, 'destZip:', destZip);
    console.log('🚛 Form state - pickupEarliest:', pickupEarliest, 'pickupLatest:', pickupLatest);
    try {
      const payload = {
        origin_city: laneData.origin_city,
        origin_state: laneData.origin_state,
        origin_zip: originZip || null,
        dest_city: laneData.dest_city,
        dest_state: laneData.dest_state,
        dest_zip: destZip || null,
        equipment_code: laneData.equipment_code,
        length_ft: laneData.length_ft,
        full_partial: fullPartial === 'partial' ? 'partial' : 'full',
        pickup_earliest: pickupEarliest,
        pickup_latest: pickupLatest,
        randomize_weight: !!randomize,
        weight_lbs: laneData.weight_lbs,
        weight_min: randomize ? Number(randMin) : null,
        weight_max: randomize ? Number(randMax) : null,
        comment: comment || null,
        commodity: commodity || null,
        status: 'pending',
        user_id: authSession.user.id,
        created_by: authSession.user.id
      };
      
      console.log('🚛 Final payload:', payload);

      if (randomize && rememberSession) {
        sessionStorage.setItem('rr_rand_min', randMin);
        sessionStorage.setItem('rr_rand_max', randMax);
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
      await loadLists();

      setMsg('✅ Lane added successfully');
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
        // Diagnostic: log user and loaded lanes
        const userId = session?.user?.id;
        console.log('[LANES] Current user id:', userId);
        if (p) console.log('[LANES] Pending lanes user_ids:', p.map(l => l.user_id));
        if (posted) console.log('[LANES] Posted lanes user_ids:', posted.map(l => l.user_id));
        if (r) console.log('[LANES] Recent lanes user_ids:', r.map(l => l.user_id));
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
      const [dc, ds] = dest.split(',').map(s => s.trim());
      
      // First check intermodal eligibility
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
      if (eligibilityCheck?.eligible) {
        setIntermodalLane(laneData);
        setPendingAction({ type: 'createLane', data: laneData });
        setShowIntermodalNudge(true);
        setBusy(false);
        return;
      }
      
      // If not intermodal eligible, continue with regular lane creation
      await createLaneFromData(laneData, authSession);
    } catch (error) {
      setMsg(error.message || 'Failed to save lane.');
    } finally {
      setBusy(false);
    }
  }

  // Helper function to create post again lane without intermodal check
  async function createPostAgainLane(lane, session) {
    // Validate the lane data
    if (!lane.origin_city || !lane.origin_state || !lane.dest_city || !lane.dest_state || !lane.equipment_code) {
      throw new Error('Invalid lane data for reposting');
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
      reference_id: generateNewReferenceId(),
      user_id: session.user.id,
      created_by: session.user.id
    };

    console.log('🚀 Making POST request to /api/lanes');
    console.log('🚀 Payload status:', payload.status);
    console.log('🚀 Payload:', payload);
    
    const response = await fetch('/api/lanes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    console.log('🚀 Response status:', response.status);
    console.log('🚀 Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create new lane');
    }

    let newLane = await response.json();
    // Handle if API returns an array
    if (Array.isArray(newLane)) {
      console.warn('API returned array, extracting first lane:', newLane);
      newLane = newLane[0];
    }
  console.log('API response for postAgain:', newLane);
    console.log('🔍 Lane status from API:', newLane.status);
    console.log('🔍 Lane ID from API:', newLane.id);
    console.log('🔍 Lane created_at from API:', newLane.created_at);
    if (!newLane || typeof newLane !== 'object') {
      console.error('Invalid server response:', newLane);
      throw new Error('Invalid response from server');
    }
    if (!newLane.id) {
      console.error('Server response missing ID:', newLane);
      throw new Error('Lane creation failed - server did not return lane data');
    }

    // Optimistically update UI so new lane appears immediately (works around list fetch timing/RLS delays)
    try {
      console.log('🔄 Updating UI - New lane status:', newLane.status);
      if (newLane.status === 'posted') {
        console.log('📮 Adding to Posted list');
        setPosted((prev) => [newLane, ...(prev || [])]);
      } else {
        console.log('⏳ Adding to Pending list');
        setPending((prev) => [newLane, ...(prev || [])]);
      }
    } catch (uiErr) {
      console.warn('Failed to optimistic-update lists:', uiErr);
    }

    // Refresh lists in background (non-blocking)
    loadLists()
      .then(() => console.log('✅ Background list reload completed'))
      .catch((e) => console.warn('Background reload failed:', e));

    setMsg(`Lane reposted successfully: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);

    // Simple performance tracking (no intelligence dependency)
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
            intelligence_metadata: {
              repost_of_successful_lane: lane.id,
              original_success_date: lane.updated_at,
              intelligence_level: 'repost_pending_intelligence'
            }
          })
        });
      }
    } catch (trackingError) {
      console.warn('Performance tracking error:', trackingError);
    }

    return newLane;
  }

  async function postAgain(lane) {
    try {
      setMsg('Creating new lane based on successful posting...');
      
      // First check intermodal eligibility
      const eligibilityCheck = await checkIntermodalEligibility({
        origin_city: lane.origin_city,
        origin_state: lane.origin_state,
        dest_city: lane.dest_city,
        dest_state: lane.dest_state,
        equipment_code: lane.equipment_code,
        length_ft: lane.length_ft,
        weight_lbs: lane.weight_lbs || null
      });
      
      if (eligibilityCheck?.eligible) {
        setIntermodalLane(lane);
        setPendingAction({ type: 'postAgain', lane: lane });
        setShowIntermodalNudge(true);
        return null; // Return null to indicate we didn't create a new lane
      }
      
      // Get auth session first  
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMsg('Authentication required. Please log in again.');
        return null;
      }
      
      // If not intermodal eligible, continue with post again
      return await createPostAgainLane(lane, session);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
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

  async function searchByRR(e) {
    e.preventDefault();
    if (!searchRR.trim()) return;
    
    setSearchLoading(true);
    setSearchResult(null);
    
    try {
      const response = await fetch(`/api/searchByReference?referenceId=${encodeURIComponent(searchRR.trim())}`);
      const data = await response.json();
      
      if (response.ok) {
        setSearchResult(data);
      } else {
        setSearchResult({ error: data.error || 'Not found' });
      }
    } catch (error) {
      setSearchResult({ error: error.message });
    } finally {
      setSearchLoading(false);
    }
  }

  function RRSearch() {
    return (
      <div className="space-y-4">
        <form onSubmit={searchByRR} className="flex gap-3">
          <input
            type="text"
            value={searchRR}
            onChange={(e) => setSearchRR(e.target.value)}
            placeholder="Enter RR# (e.g., RR12345)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={searchLoading || !searchRR.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-md font-medium"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResult && (
          <div className="bg-gray-800 rounded-lg border border-gray-600 p-4">
            {searchResult.error ? (
              <p className="text-red-400">❌ {searchResult.error}</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-100">
                    Found Lane: {searchResult.lane.origin_city}, {searchResult.lane.origin_state} → {searchResult.lane.dest_city}, {searchResult.lane.dest_state}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    searchResult.lane.status === 'covered' ? 'bg-green-100 text-green-800' :
                    searchResult.lane.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {searchResult.lane.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-300">
                  <div>
                    <span className="font-medium">Equipment:</span> {searchResult.lane.equipment_code}
                  </div>
                  <div>
                    <span className="font-medium">Weight:</span> {searchResult.lane.weight_lbs?.toLocaleString()} lbs
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {new Date(searchResult.lane.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Generated RRs:</span> {searchResult.totalPostings}
                  </div>
                </div>
                {searchResult.postedPairs.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Generated Reference IDs:</p>
                    <div className="flex flex-wrap gap-1">
                      {searchResult.postedPairs.map((pair, idx) => (
                        <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded">
                          {pair.reference_id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
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

        {/* RR# Search Section */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden mb-6">
          <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-100">RR# Search</h2>
          </div>
          <div className="p-4 bg-gray-900">
            <RRSearch />
          </div>
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
              <button className={`px-3 py-1 rounded-md ${tab === 'active' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:bg-blue-700 hover:text-white'}`} onClick={() => setTab('active')}>
                Active ({pending.length})
              </button>
              <button className={`px-3 py-1 rounded-md ${tab === 'covered' ? 'bg-green-700 text-white' : 'text-gray-400 hover:bg-green-700 hover:text-white'}`} onClick={() => setTab('covered')}>
                Covered ({posted.length})
              </button>
              <button className={`px-3 py-1 rounded-md ${tab === 'archived' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`} onClick={() => setTab('archived')}>
                Archived ({recent.length})
              </button>
            </div>
          }
        >
          <div className="divide-y divide-gray-800">
            {(tab === 'active' ? pending : tab === 'covered' ? posted : recent).map(l => (
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
                  {(l.status === 'pending' || l.status === 'posted') && (
                    <button onClick={() => updateStatus(l, 'covered')} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
                      Mark Covered
                    </button>
                  )}
                  {l.status === 'covered' && (
                    <button onClick={() => postAgain(l)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg">
                      🚀 Post Again
                    </button>
                  )}
                  {l.status === 'covered' && (
                    <button onClick={() => updateStatus(l, 'archived')} className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg">
                      Archive
                    </button>
                  )}
                  {l.status === 'archived' && (
                    <button onClick={() => updateStatus(l, 'covered')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                      Restore to Covered
                    </button>
                  )}
                  <button onClick={() => delLane(l)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {(tab === 'active' ? pending : tab === 'covered' ? posted : recent).length === 0 && (
              <div className="py-6 text-sm text-gray-400">No lanes in this category.</div>
            )}
          </div>
        </Section>

        {/* Intermodal Nudge Modal */}
        {showIntermodalNudge && (
          <IntermodalNudge
            lane={intermodalLane}
            onClose={async () => {
              setShowIntermodalNudge(false);
              
              // Continue with the pending action if user chose "Continue with Truck"
              console.log('🚛 Continue with Truck clicked, pendingAction:', pendingAction);
              if (pendingAction) {
                setBusy(true);
                try {
                  if (pendingAction.type === 'createLane') {
                    console.log('🚛 Creating lane from pending data:', pendingAction.data);
                    const { data: { session: authSession } } = await supabase.auth.getSession();
                    if (authSession?.access_token) {
                      await createLaneFromData(pendingAction.data, authSession);
                    } else {
                      console.error('🚛 No auth session available');
                    }
                  } else if (pendingAction.type === 'postAgain') {
                    console.log('🚛 Post again from pending action');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                      await createPostAgainLane(pendingAction.lane, session);
                    }
                  }
                } catch (error) {
                  console.error('🚛 Continue with truck error:', error);
                  setMsg(`❌ ${error.message}`);
                } finally {
                  setBusy(false);
                  setPendingAction(null);
                }
              } else {
                console.log('🚛 No pending action found');
              }
            }}
            onEmail={(lane) => {
              setShowIntermodalNudge(false);
              setShowIntermodalEmail(true);
              setPendingAction(null); // Clear pending action when choosing intermodal
            }}
          />
        )}

        {/* Randomize Weight Modal */}
        {randOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Randomize Weight Range</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Min Weight (lbs)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={randMin} 
                    onChange={(e) => setRandMin(e.target.value)} 
                    className="inp"
                    placeholder="e.g., 20000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Max Weight (lbs)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={randMax} 
                    onChange={(e) => setRandMax(e.target.value)} 
                    className="inp"
                    placeholder="e.g., 40000"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="flex items-center text-sm text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={rememberSession} 
                    onChange={(e) => setRememberSession(e.target.checked)}
                    className="mr-2 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                  />
                  Remember these values for this session
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setRandomize(false);
                    setRandOpen(false);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setRandOpen(false)}
                  className="btn-primary"
                >
                  Set Range
                </button>
              </div>
            </div>
          </div>
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
