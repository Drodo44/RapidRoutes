// pages/lanes.js
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import CityAutocomplete from '../components/CityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import IntermodalNudge from '../components/IntermodalNudge.jsx';
import IntermodalEmailModal from '../components/IntermodalEmailModal.jsx';
import supabase from '../utils/supabaseClient';
// Removed direct import - now using API call for server-side intelligence generation
import { useAuth } from '../contexts/AuthContext';
import { checkIntermodalEligibility } from '../lib/intermodalAdvisor';
import { generateReferenceId, generateNewReferenceId, getDisplayReferenceId } from '../lib/referenceIdUtils';
import Head from 'next/head';

function Section({ title, children, right, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</h2>
        {right}
      </div>
      <div className="card-body">{children}</div>
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
      
      // Debug weight randomization values
      // Weight validation for debugging if needed
      if (randomize && (!randMin || !randMax)) {
        console.warn('Weight randomization enabled but min/max not set');
      }
      
      // First check intermodal eligibility - include ALL required form data
      const laneData = {
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
        weight_min: randomize ? Number(randMin) || null : null,
        weight_max: randomize ? Number(randMax) || null : null,
        comment: comment || null,
        commodity: commodity || null
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
      console.log('🚛 Direct lane creation completed, reloading lists...');
      await loadLists();
      console.log('🚛 Lists reloaded after direct lane creation');
      
      // Clear form for next entry
      setOrigin(''); 
      setDest('');
      setWeight('');
      setComment('');
      setCommodity('');
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

  // Lists - Simplified to 2 categories
  const [tab, setTab] = useState('current');
  const [current, setCurrent] = useState([]); // Current working lanes
  const [archive, setArchive] = useState([]); // Archived lanes
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // Track what action to continue after intermodal check

  // Master Date Setter state
  const [showMasterDateModal, setShowMasterDateModal] = useState(false);
  const [masterEarliest, setMasterEarliest] = useState('');
  const [masterLatest, setMasterLatest] = useState('');
  const [masterScope, setMasterScope] = useState('all'); // 'all', 'pending', 'active'

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Show loading if auth is still loading
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px' }}>Loading Lanes...</p>
        </div>
      </div>
    );
  }

  // Show loading if not authenticated (during redirect)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-border" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px' }}>Redirecting to login...</p>
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

  // Edit lane functionality
  function startEditLane(lane) {
    setEditingLane({ ...lane });
    setShowEditModal(true);
  }

  async function saveEditedLane() {
    if (!editingLane) return;
    
    setBusy(true);
    setMsg('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMsg('Authentication required. Please log in again.');
        return;
      }

      const response = await fetch(`/api/lanes/${editingLane.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          pickup_earliest: editingLane.pickup_earliest,
          pickup_latest: editingLane.pickup_latest,
          weight_lbs: editingLane.weight_lbs,
          weight_min: editingLane.weight_min,
          weight_max: editingLane.weight_max,
          comment: editingLane.comment,
          commodity: editingLane.commodity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update lane');
      }

      setMsg('✅ Lane updated successfully');
      setShowEditModal(false);
      setEditingLane(null);
      await loadLists(); // Refresh the lists

    } catch (error) {
      console.error('Edit lane error:', error);
      setMsg(error.message || 'Failed to update lane');
    } finally {
      setBusy(false);
    }
  }

  function cancelEdit() {
    setEditingLane(null);
    setShowEditModal(false);
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
        { data: currentLanes = [], error: currentError },
        { data: archivedLanes = [], error: archivedError }
      ] = await Promise.all([
        supabase.from('lanes').select('*').eq('lane_status', 'current').order('created_at', { ascending: false }).limit(200),
        supabase.from('lanes').select('*').eq('lane_status', 'archive').order('created_at', { ascending: false }).limit(50),
      ]);

      if (currentError) throw currentError;
      if (archivedError) throw archivedError;

      console.log('Lists loaded successfully - Current:', currentLanes.length, 'Archive:', archivedLanes.length);

      // Ensure we always have arrays, not objects
      setCurrent(Array.isArray(currentLanes) ? currentLanes : []);
      setArchive(Array.isArray(archivedLanes) ? archivedLanes : []);
    } catch (error) {
      console.error('Failed to load lanes:', error);
      setCurrent([]); 
      setArchive([]);
      setMsg(`❌ Failed to load lanes: ${error.message}`);
    }
  }

  useEffect(() => {
    console.log('Initial load effect triggered');
    loadLists();
  }, []);

  // Master Date Setter - Bulk update dates for multiple lanes
  async function applyMasterDates() {
    if (!masterEarliest) {
      setMsg('❌ Pickup Earliest date is required');
      return;
    }
    
    setBusy(true);
    setMsg('');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in again.');
      }

      // Determine which lanes to update based on scope
      let laneIds = [];
      if (masterScope === 'all') {
        laneIds = current.map(l => l.id);
      }

      if (laneIds.length === 0) {
        setMsg('❌ No lanes found to update');
        setBusy(false);
        return;
      }

      // Bulk update via Supabase
      const { error } = await supabase
        .from('lanes')
        .update({
          pickup_earliest: masterEarliest,
          pickup_latest: masterLatest || masterEarliest
        })
        .in('id', laneIds);

      if (error) throw error;

      setMsg(`✅ Successfully updated ${laneIds.length} lane(s)`);
      setShowMasterDateModal(false);
      setMasterEarliest('');
      setMasterLatest('');
      setMasterScope('all');
      
      // Reload lanes to show updated dates
      await loadLists();
    } catch (error) {
      console.error('Bulk date update failed:', error);
      setMsg(`❌ Failed to update dates: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

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
      console.log('🚛 Building payload...');
      console.log('🚛 authSession:', authSession);
      console.log('🚛 authSession.user:', authSession?.user);
      console.log('🚛 authSession.user.id:', authSession?.user?.id);
      
      // Validate authSession early
      if (!authSession?.user?.id) {
        alert('⚠️ Authentication error: No user ID found');
        throw new Error('Authentication error: No user ID found');
      }
      
      const payload = {
        origin_city: laneData.origin_city,
        origin_state: laneData.origin_state,
        // Store both ZIP5 and ZIP3 variants for market logic + accuracy
        origin_zip5: laneData.origin_zip,
        origin_zip: laneData.origin_zip ? laneData.origin_zip.slice(0,3) : null,
        dest_city: laneData.dest_city,
        dest_state: laneData.dest_state,
        dest_zip5: laneData.dest_zip,
        dest_zip: laneData.dest_zip ? laneData.dest_zip.slice(0,3) : null,
        equipment_code: laneData.equipment_code,
        length_ft: laneData.length_ft,
        full_partial: laneData.full_partial,
        pickup_earliest: laneData.pickup_earliest,
        pickup_latest: laneData.pickup_latest,
        randomize_weight: laneData.randomize_weight,
        weight_lbs: laneData.weight_lbs,
        weight_min: laneData.weight_min,
        weight_max: laneData.weight_max,
        comment: laneData.comment,
        commodity: laneData.commodity,
  // Use new lane_status column; do not set deprecated status
  lane_status: 'current',
        user_id: authSession.user.id,
        created_by: authSession.user.id
      };
      
      console.log('🚛 Payload built successfully');
      
      console.log('🚛 Final payload:', payload);

      try {
        if (laneData.randomize_weight && laneData.weight_min && laneData.weight_max) {
          console.log('🚛 Saving weight range to session:', laneData.weight_min, laneData.weight_max);
          sessionStorage.setItem('rr_rand_min', laneData.weight_min.toString());
          sessionStorage.setItem('rr_rand_max', laneData.weight_max.toString());
        }
      } catch (sessionError) {
        console.error('🚛 Session storage error:', sessionError);
        // Continue anyway, this isn't critical
      }

      console.log('🚛 About to make POST request to /api/lanes');
      console.log('🚛 Request payload:', JSON.stringify(payload, null, 2));
      console.log('🚛 Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token?.substring(0, 20)}...`
      });
      
      const response = await fetch('/api/lanes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('🚛 Response received:', response.status, response.statusText);
      console.log('🚛 Response ok:', response.ok);

      if (!response.ok) {
        console.log('🚛 Response not ok, getting error data...');
        const errorData = await response.json();
        console.log('🚛 Error data:', errorData);
        throw new Error(errorData.error || 'Failed to save lane');
      }

      console.log('🚛 Response ok, getting lane data...');
      const newLane = await response.json();
      console.log('🚛 New lane created:', newLane);
      
      console.log('🚛 Setting success message...');
      setMsg('✅ Lane added successfully');
      console.log('🚛 Success message set');
      
      console.log('🚛 Lane creation completed successfully!');
      // Return the new lane for further processing
      return newLane;
      
    } catch (error) {
      console.error('🚛 createLaneFromData FAILED:', error);
      console.error('🚛 Error details:', error.message);
      console.error('🚛 Error stack:', error.stack);
      alert(`🚛 Lane Creation Failed: ${error.message}`);
      setMsg(`❌ Failed to create lane: ${error.message}`);
      throw error; // Re-throw so calling function can handle it
    }
  }

  // Continue submitLane function - this code was broken from the main function
  // This belongs back in submitLane after the destination parsing
  async function continueSubmitLane(oc, os, authSession) {
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
    
    try {
      // If not intermodal eligible, continue with regular lane creation
      const newLane = await createLaneFromData(laneData, authSession);
      
      // After successful creation, reload the lists
      await loadLists();
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
      // Preserve original 5-digit zip if present; fallback to legacy origin_zip
      origin_zip5: lane.origin_zip5 ?? lane.origin_zip ?? null,
      origin_zip: (lane.origin_zip5 ?? lane.origin_zip) ? (lane.origin_zip5 ?? lane.origin_zip).slice(0,3) : null,
      dest_city: lane.dest_city,
      dest_state: lane.dest_state,
      dest_zip5: lane.dest_zip5 ?? lane.dest_zip ?? null,
      dest_zip: (lane.dest_zip5 ?? lane.dest_zip) ? (lane.dest_zip5 ?? lane.dest_zip).slice(0,3) : null,
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
  // Use new lane_status column for reposted lanes
  lane_status: 'current',
      reference_id: generateNewReferenceId(),
      user_id: session.user.id,
      created_by: session.user.id
    };

    console.log('🚀 Making POST request to /api/lanes');
  console.log('🚀 Payload lane_status:', payload.lane_status || payload.status);
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
  console.log('🔄 Updating UI - New lane lane_status:', newLane.lane_status || newLane.status);
  const laneStatus = newLane.lane_status || newLane.status;
  // All new lanes go to current list (simplified status system)
  if (laneStatus === 'current' || !laneStatus) {
        console.log('✅ Adding to Current list');
        setCurrent((prev) => [newLane, ...(prev || [])]);
      } else if (laneStatus === 'archive') {
        console.log('📦 Adding to Archive list');
        setArchive((prev) => [newLane, ...(prev || [])]);
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
  // API now expects { id, lane_status }
  body: JSON.stringify({ id: lane.id, lane_status: status }),
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

  // Generate CSV function
  async function generateCSV() {
    try {
      setBusy(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get only current lanes with city choices saved for CSV generation
      const lanesWithChoices = current.filter(l => l.saved_origin_cities?.length > 0 || l.saved_dest_cities?.length > 0);
      
      if (lanesWithChoices.length === 0) {
        alert('No lanes with city choices saved. Go to Post Options to select cities first.');
        return;
      }

      if (!confirm(`Generate DAT CSV for ${lanesWithChoices.length} lane(s) with city choices? This will create a downloadable CSV file.`)) {
        return;
      }

      // Call the CSV export API - no pending flag, use active lanes
      const response = await fetch('/api/exportDatCsv', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate CSV');
      }

      // Handle the CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      link.download = `DAT_Export_${dateStr}.csv`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message with RR number info
      alert(`CSV generated successfully! File contains ${lanesWithChoices.length} lane(s) with RR numbers for tracking and sourcing. Use the RR# search to find generated lanes later.`);
      
    } catch (error) {
      console.error('CSV Generation Error:', error);
      alert(`Failed to generate CSV: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  function RRSearch() {
    return (
      <div className="space-y-4">
        <form onSubmit={searchByRR} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={searchRR}
            onChange={(e) => setSearchRR(e.target.value)}
            placeholder="Enter RR# (e.g., RR12345)"
            className="form-input"
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            disabled={searchLoading || !searchRR.trim()}
            className="btn btn-primary"
          >
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResult && (
          <div className="card">
            {searchResult.error ? (
              <p style={{ color: 'var(--danger)' }}>❌ {searchResult.error}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Found Lane: {searchResult.lane.origin_city}, {searchResult.lane.origin_state} → {searchResult.lane.dest_city}, {searchResult.lane.dest_state}
                  </h3>
                  <span className="badge" style={{
                    backgroundColor: 
                      (searchResult.lane.lane_status || searchResult.lane.status) === 'current' ? 'var(--success)' :
                      (searchResult.lane.lane_status || searchResult.lane.status) === 'archive' ? 'var(--muted)' :
                      'var(--primary)',
                    color: 'white'
                  }}>
                    {searchResult.lane.lane_status || searchResult.lane.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>Equipment:</span> {searchResult.lane.equipment_code}
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>Weight:</span> {searchResult.lane.weight_lbs?.toLocaleString()} lbs
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>Created:</span> {new Date(searchResult.lane.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span style={{ fontWeight: 500 }}>Generated RRs:</span> {searchResult.totalPostings}
                  </div>
                </div>
                {searchResult.postedPairs.length > 0 && (
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Generated Reference IDs:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {searchResult.postedPairs.map((pair, idx) => (
                        <span key={idx} className="badge badge-secondary">
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
      
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '16px' }}>
        {/* Page Header */}
        <div style={{ 
          marginBottom: '20px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Lane Management
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Create and manage freight lanes for DAT posting
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowMasterDateModal(true)}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Set Dates for All Lanes
          </button>
        </div>

        {/* RR# Search Section */}
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          marginBottom: '16px',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--surface-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              RR# Search
            </h2>
          </div>
          <div style={{ padding: '16px' }}>
            <RRSearch />
          </div>
        </div>

        <div style={{ 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          marginBottom: '16px',
          padding: '12px'
        }}>
          <h2 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>New Lane</h2>
          <form onSubmit={submitLane} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <CityAutocomplete id="origin" label="Origin (City, ST)" value={origin} onChange={setOrigin} onPick={onPickOrigin} />
              <CityAutocomplete id="dest" label="Destination (City, ST)" value={dest} onChange={setDest} onPick={onPickDest} />
              <EquipmentPicker code={equipment} onChange={setEquipment} />

              <div>
                <label className="form-label">Full / Partial</label>
                <select value={fullPartial} onChange={(e) => setFullPartial(e.target.value)} className="form-input">
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div>
                <label className="form-label">Length (ft)</label>
                <input type="number" min={1} value={lengthFt} onChange={(e) => setLengthFt(e.target.value)} className="form-input" />
              </div>

              <div>
                <label className="form-label">Pickup Earliest</label>
                <input type="date" value={pickupEarliest} onChange={(e) => setPickupEarliest(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Pickup Latest</label>
                <input type="date" value={pickupLatest} onChange={(e) => setPickupLatest(e.target.value)} className="form-input" />
              </div>

              {!randomize && (
                <div>
                  <label className="form-label">Weight (lbs)</label>
                  <input type="number" min={1} value={weight} onChange={(e) => setWeight(e.target.value)} className="form-input" />
                </div>
              )}
              {randomize && (
                <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="form-label">Random Min (lbs)</label>
                    <input type="number" min={1} value={randMin} onChange={(e) => setRandMin(e.target.value)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Random Max (lbs)</label>
                    <input type="number" min={1} value={randMax} onChange={(e) => setRandMax(e.target.value)} className="form-input" />
                  </div>
                </div>
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />
                  Randomize Weight
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Comment (optional)</label>
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} className="form-input" />
              </div>
              <div>
                <label className="form-label">Commodity (optional)</label>
                <input type="text" value={commodity} onChange={(e) => setCommodity(e.target.value)} className="form-input" />
              </div>

              {msg && <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: 'var(--danger)' }}>{msg}</div>}

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button type="submit" disabled={busy} className="btn btn-primary" style={{ fontSize: '12px', padding: '8px 16px' }}>
                  {busy ? 'Saving…' : 'Add Lane'}
                </button>
              </div>
            </form>
        </div>

        {/* Lanes Section */}
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          padding: '12px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Lanes
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/post-options"
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                title="Manual Post Options (choose origin/destination posting cities)"
              >
                Post Options
              </Link>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Post Options button clicked, navigating to /post-options');
                  router.push('/post-options');
                }}
                disabled={busy || current.length === 0}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                title={`Generate lane pairings for ${current.length} current lane(s)`}
              >
                🎯 Generate Pairings ({current.length})
              </button>
              <button 
                onClick={generateCSV}
                disabled={busy || current.length === 0}
                className="btn btn-success"
                style={{ fontSize: '12px', padding: '6px 12px' }}
                title={`Generate DAT CSV for ${current.length} current lane(s) with city choices`}
              >
                {busy ? 'Generating...' : `📊 Generate CSV (${current.length})`}
              </button>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button 
                  className={tab === 'current' ? 'btn btn-primary' : 'btn btn-secondary'} 
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setTab('current')}
                >
                  Current ({current.length})
                </button>
                <button 
                  className={tab === 'archive' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => setTab('archive')}
                >
                  Archive ({archive.length})
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {Array.isArray(tab === 'current' ? current : archive) && (tab === 'current' ? current : archive).map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, fontSize: '13px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {(l.reference_id || getDisplayReferenceId(l)) && (
                      <span className="badge" style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600 }}>
                        #{l.reference_id || getDisplayReferenceId(l)}
                      </span>
                    )}
                    <span style={{ fontWeight: 500 }}>{l.origin_city}, {l.origin_state}</span>
                    <span style={{ opacity: 0.4 }}>→</span>
                    <span style={{ fontWeight: 500 }}>{l.dest_city || l.destination_city}, {l.dest_state || l.destination_state}</span>
                    <span style={{ opacity: 0.6 }}>{l.equipment_code} • {l.length_ft}ft</span>
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>
                    {l.randomize_weight 
                      ? `${l.weight_min || 0}-${l.weight_max || 0} lbs` 
                      : `${l.weight_lbs || '—'} lbs`}
                    <span style={{ marginLeft: '12px' }}>📅 {l.pickup_earliest || '—'} → {l.pickup_latest || '—'}</span>
                    {l.comment && <span style={{ marginLeft: '12px' }}>💬 {l.comment}</span>}
                  </div>
                  {l.saved_origin_cities?.length > 0 && (
                    <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--success)', opacity: 0.8 }}>
                      ✓ City choices saved • Ready for recap
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {/* Current lanes - show action buttons */}
                  {tab === 'current' && (
                    <>
                      <a href="/post-options" className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                        🎯 Post Options
                      </a>
                      {l.saved_origin_cities?.length > 0 && (
                        <a href="/recap" className="btn btn-success" style={{ fontSize: '12px', padding: '4px 10px' }}>
                          📊 Recap
                        </a>
                      )}
                      <button onClick={() => startEditLane(l)} className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => updateStatus(l, 'archive')} className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                        📦 Archive
                      </button>
                    </>
                  )}
                  {/* Archived lanes - show restore button */}
                  {tab === 'archive' && (
                    <button onClick={() => updateStatus(l, 'current')} className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 10px' }}>
                      🔄 Restore
                    </button>
                  )}
                  <button onClick={() => delLane(l)} className="btn btn-danger" style={{ fontSize: '12px', padding: '4px 10px' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {(tab === 'current' ? current : archive).length === 0 && (
              <div style={{ padding: '48px', textAlign: 'center', opacity: 0.5, fontSize: '12px', color: 'var(--text-secondary)' }}>
                No lanes in this category
              </div>
            )}
          </div>
        </div>

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
                      console.log('🚛 Lane created successfully, reloading lists...');
                      await loadLists();
                      console.log('🚛 Lists reloaded, lane should now be visible in UI');
                    } else {
                      console.error('🚛 No auth session available');
                    }
                  } else if (pendingAction.type === 'postAgain') {
                    console.log('🚛 Post again from pending action');
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                      await createPostAgainLane(pendingAction.lane, session);
                      console.log('🚛 Post again completed, reloading lists...');
                      await loadLists();
                      console.log('🚛 Lists reloaded after post again');
                    }
                  }
                } catch (error) {
                  console.error('🚛 Continue with truck error:', error);
                  console.error('🚛 Error message:', error.message);
                  console.error('🚛 Error stack:', error.stack);
                  alert(`ERROR: ${error.message}`); // Make it visible!
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

        {/* Edit Lane Modal */}
        {showEditModal && editingLane && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '600px',
              width: '100%',
              margin: '0 var(--space-4)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Edit Lane: {editingLane.origin_city}, {editingLane.origin_state} → {editingLane.dest_city}, {editingLane.dest_state}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {/* Pickup Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div>
                    <label className="form-label">Pickup Earliest</label>
                    <input
                      type="date"
                      value={editingLane.pickup_earliest || ''}
                      onChange={(e) => setEditingLane({...editingLane, pickup_earliest: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="form-label">Pickup Latest</label>
                    <input
                      type="date"
                      value={editingLane.pickup_latest || ''}
                      onChange={(e) => setEditingLane({...editingLane, pickup_latest: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Weight Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                  <div>
                    <label className="form-label">Weight (lbs)</label>
                    <input
                      type="number"
                      value={editingLane.weight_lbs || ''}
                      onChange={(e) => setEditingLane({...editingLane, weight_lbs: e.target.value ? parseInt(e.target.value) : null})}
                      className="form-input"
                      placeholder="Exact weight"
                    />
                  </div>
                  <div>
                    <label className="form-label">Weight Min</label>
                    <input
                      type="number"
                      value={editingLane.weight_min || ''}
                      onChange={(e) => setEditingLane({...editingLane, weight_min: e.target.value ? parseInt(e.target.value) : null})}
                      className="form-input"
                      placeholder="Min weight"
                    />
                  </div>
                  <div>
                    <label className="form-label">Weight Max</label>
                    <input
                      type="number"
                      value={editingLane.weight_max || ''}
                      onChange={(e) => setEditingLane({...editingLane, weight_max: e.target.value ? parseInt(e.target.value) : null})}
                      className="form-input"
                      placeholder="Max weight"
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="form-label">Comment</label>
                  <textarea
                    value={editingLane.comment || ''}
                    onChange={(e) => setEditingLane({...editingLane, comment: e.target.value})}
                    rows={3}
                    className="form-input"
                    placeholder="Optional comment..."
                  />
                </div>

                {/* Commodity */}
                <div>
                  <label className="form-label">Commodity</label>
                  <input
                    type="text"
                    value={editingLane.commodity || ''}
                    onChange={(e) => setEditingLane({...editingLane, commodity: e.target.value})}
                    className="form-input"
                    placeholder="Optional commodity..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                <button
                  onClick={saveEditedLane}
                  disabled={busy}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {busy ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={busy}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Randomize Weight Modal */}
        {randOpen && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-6)',
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '450px',
              width: '100%',
              margin: '0 var(--space-4)'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>
                Randomize Weight Range
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <div>
                  <label className="form-label">Min Weight (lbs)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={randMin} 
                    onChange={(e) => setRandMin(e.target.value)} 
                    className="form-input"
                    placeholder="e.g., 20000"
                  />
                </div>
                <div>
                  <label className="form-label">Max Weight (lbs)</label>
                  <input 
                    type="number" 
                    min={1} 
                    value={randMax} 
                    onChange={(e) => setRandMax(e.target.value)} 
                    className="form-input"
                    placeholder="e.g., 40000"
                  />
                </div>
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={rememberSession} 
                    onChange={(e) => setRememberSession(e.target.checked)}
                    style={{ marginRight: 'var(--space-2)' }}
                  />
                  Remember these values for this session
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                <button 
                  onClick={() => {
                    setRandomize(false);
                    setRandOpen(false);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => setRandOpen(false)}
                  className="btn btn-primary"
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

        {/* Master Date Setter Modal */}
        {showMasterDateModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--surface-border)',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--surface-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: 600,
                  color: 'var(--text-primary)'
                }}>
                  Set Dates for All Lanes
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterDateModal(false);
                    setMasterEarliest('');
                    setMasterLatest('');
                    setMasterScope('all');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '20px',
                    lineHeight: 1,
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px' }}>
                <p style={{ 
                  fontSize: '13px', 
                  color: 'var(--text-secondary)', 
                  marginBottom: '20px',
                  lineHeight: 1.5
                }}>
                  Bulk update pickup dates for multiple lanes at once. This saves time when moving from one day to the next.
                </p>

                {/* Date Inputs */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>
                    Pickup Earliest <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={masterEarliest}
                    onChange={(e) => setMasterEarliest(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ marginBottom: '8px' }}>
                    Pickup Latest
                  </label>
                  <input
                    type="date"
                    value={masterLatest}
                    onChange={(e) => setMasterLatest(e.target.value)}
                    className="form-input"
                    placeholder="Optional - defaults to earliest date"
                  />
                  <p style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)', 
                    marginTop: '4px' 
                  }}>
                    If left blank, will use the same date as Pickup Earliest
                  </p>
                </div>

                {/* Scope Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label className="form-label" style={{ marginBottom: '12px' }}>
                    Apply to:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: masterScope === 'all' ? 'var(--primary-alpha)' : 'transparent',
                      border: '1px solid',
                      borderColor: masterScope === 'all' ? 'var(--primary)' : 'var(--surface-border)',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="masterScope"
                        value="all"
                        checked={masterScope === 'all'}
                        onChange={(e) => setMasterScope(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          All Current Lanes
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Update {current.length} lanes
                        </div>
                      </div>
                    </label>

                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: masterScope === 'pending' ? 'var(--primary-alpha)' : 'transparent',
                      border: '1px solid',
                      borderColor: masterScope === 'pending' ? 'var(--primary)' : 'var(--surface-border)',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="masterScope"
                        value="pending"
                        checked={masterScope === 'pending'}
                        onChange={(e) => setMasterScope(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          Selected Lanes
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Update specific lanes only
                        </div>
                      </div>
                    </label>

                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '12px',
                      backgroundColor: masterScope === 'active' ? 'var(--primary-alpha)' : 'transparent',
                      border: '1px solid',
                      borderColor: masterScope === 'active' ? 'var(--primary)' : 'var(--surface-border)',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="masterScope"
                        value="active"
                        checked={masterScope === 'active'}
                        onChange={(e) => setMasterScope(e.target.value)}
                        style={{ marginRight: '10px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          Reserved
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          (Not used)
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {msg && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: msg.includes('✅') ? 'var(--success-alpha)' : 'var(--danger-alpha)',
                    border: '1px solid',
                    borderColor: msg.includes('✅') ? 'var(--success)' : 'var(--danger)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    {msg}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid var(--surface-border)',
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterDateModal(false);
                    setMasterEarliest('');
                    setMasterLatest('');
                    setMasterScope('all');
                  }}
                  className="btn"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyMasterDates}
                  className="btn btn-primary"
                  disabled={busy || !masterEarliest}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {busy ? (
                    <>
                      <span className="spinner-border spinner-border-sm" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Apply Dates
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LanesPage;
