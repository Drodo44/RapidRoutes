// pages/lanes.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster, toast } from 'react-hot-toast';

// Components
import DashboardLayout from '../components/DashboardLayout';
import GoogleCityAutocomplete from '../components/GoogleCityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import LaneCard from '../components/LaneCard.jsx';
import RouteMapModal from '../components/RouteMapModal.jsx';
// We'll use a simple inline modal for editing if one doesn't exist, 
// to avoid import errors. 

import supabase from '../utils/supabaseClient';
import { getMyLanesOnlyPreference, setMyLanesOnlyPreference } from '../lib/laneFilterPreferences.js';
import { useAuth } from '../contexts/AuthContext';
import { generateOptions } from '../components/post-options/OptionsGenerator';

// --- Edit Lane Modal Component (Inline) ---
function EditLaneModal({ lane, isOpen, onClose, onSave }) {
  if (!isOpen || !lane) return null;

  const [localLane, setLocalLane] = useState({ ...lane });

  const handleChange = (field, value) => {
    setLocalLane(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 10, 14, 0.98) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.2)'
      }}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Edit Lane: {lane.origin_city} → {lane.dest_city || lane.destination_city}</h3>
          <button onClick={onClose} className="text-secondary hover:text-white text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Pickup Earliest</label>
              <input
                type="date"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500/50 outline-none"
                value={localLane.pickup_earliest?.split('T')[0] || ''}
                onChange={e => handleChange('pickup_earliest', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Pickup Latest</label>
              <input
                type="date"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500/50 outline-none"
                value={localLane.pickup_latest?.split('T')[0] || ''}
                onChange={e => handleChange('pickup_latest', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Equipment</label>
              <input
                type="text"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500/50 outline-none"
                value={localLane.equipment_code || ''}
                onChange={e => handleChange('equipment_code', e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Length</label>
              <input
                type="number"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500/50 outline-none"
                value={localLane.length_ft || ''}
                onChange={e => handleChange('length_ft', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Rate</label>
              <input
                type="number"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-emerald-500/50 outline-none font-mono"
                value={localLane.rate || ''}
                onChange={e => handleChange('rate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Weight</label>
              <input
                type="number"
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500/50 outline-none font-mono"
                value={localLane.weight_lbs || ''}
                onChange={e => handleChange('weight_lbs', e.target.value)}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2">Email-Only Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">Pickup/Del Time</label>
                <input
                  type="text"
                  placeholder="08:00 - 16:00"
                  className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white"
                  value={localLane.pickup_time || ''}
                  onChange={e => handleChange('pickup_time', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">Temperature</label>
                <input
                  type="text"
                  placeholder="Maintain 34F"
                  className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white"
                  value={localLane.temp || ''}
                  onChange={e => handleChange('temp', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">Commodity</label>
                <input
                  type="text"
                  className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white"
                  value={localLane.commodity || ''}
                  onChange={e => handleChange('commodity', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase">Email Notes</label>
              <textarea
                rows={2}
                className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white resize-none"
                value={localLane.email_notes || ''}
                onChange={e => handleChange('email_notes', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
            <button onClick={onClose} className="px-6 py-2 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-semibold">Cancel</button>
            <button
              onClick={() => onSave(localLane)}
              className="px-8 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg shadow-cyan-900/20 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LanesPage() {
  const router = useRouter();
  const { loading, isAuthenticated, session, profile } = useAuth(); // isAdmin removed if unused

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
  const [pickupTime, setPickupTime] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [temp, setTemp] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  // Selection
  const [selectedLanes, setSelectedLanes] = useState([]);
  const [bulkDate, setBulkDate] = useState('');

  // Weight
  const [randomize, setRandomize] = useState(false);
  const [randMin, setRandMin] = useState('');
  const [randMax, setRandMax] = useState('');
  const [weight, setWeight] = useState('');
  const [rate, setRate] = useState('');
  const [isPosted, setIsPosted] = useState(false);

  // Rate Validations
  const [randomizeRate, setRandomizeRate] = useState(false);
  const [randRateMin, setRandRateMin] = useState('');
  const [randRateMax, setRandRateMax] = useState('');

  // Lists
  const [current, setCurrent] = useState([]);
  const [archive, setArchive] = useState([]);
  const [busy, setBusy] = useState(false);

  // Map Modal State
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedLaneForMap, setSelectedLaneForMap] = useState(null);

  // Edit State
  const [editingLane, setEditingLane] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Admin view toggle (My Lanes vs All)
  const [showMyLanesOnly, setShowMyLanesOnly] = useState(false);

  useEffect(() => {
    // Load preference client-side to prevent hydration mismatch
    const pref = getMyLanesOnlyPreference();
    if (pref !== null) setShowMyLanesOnly(pref);
  }, []);

  useEffect(() => {
    setMyLanesOnlyPreference(showMyLanesOnly);
  }, [showMyLanesOnly]);

  // Auth Redirect
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Load Lanes
  useEffect(() => {
    if (isAuthenticated) {
      loadLists();
    }
  }, [isAuthenticated, showMyLanesOnly]);

  async function loadLists() {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) return;

      const params = new URLSearchParams({ limit: '200' });
      if (showMyLanesOnly && profile?.organization_id) {
        params.append('organizationId', profile.organization_id);
      }

      const [currentRes, archivedRes] = await Promise.all([
        fetch(`/api/lanes?status=current&${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        }),
        fetch(`/api/lanes?status=archive&limit=50${showMyLanesOnly && profile?.organization_id ? `&organizationId=${profile.organization_id}` : ''}`, {
          headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        })
      ]);

      const [currentJson, archivedJson] = await Promise.all([
        currentRes.json().catch(() => []),
        archivedRes.json().catch(() => []),
      ]);

      setCurrent(Array.isArray(currentJson) ? currentJson : []);
      setArchive(Array.isArray(archivedJson) ? archivedJson : []);
    } catch (error) {
      console.error('Failed to load lanes:', error);
      toast.error('Failed to load lanes');
    }
  }

  // --- Actions ---

  async function submitLane(e) {
    if (e) e.preventDefault();

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession?.access_token) {
      toast.error('Authentication required');
      return;
    }

    setBusy(true);
    try {
      const [oc, os] = origin.split(',').map(s => s ? s.trim() : '');
      const [dc, ds] = dest.split(',').map(s => s ? s.trim() : '');

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
        rate: rate ? Number(rate) : null,
        randomize_rate: !!randomizeRate,
        rate_min: randomizeRate ? Number(randRateMin) || null : null,
        rate_max: randomizeRate ? Number(randRateMax) || null : null,
        comment: comment || null,
        commodity: commodity || null,
        pickup_time: pickupTime || null,
        delivery_time: deliveryTime || null,
        temp: temp || null,
        email_notes: emailNotes || null
      };

      // Create lane directly (no intermodal check)
      await createLaneFromData(laneData, authSession);
      toast.success('Lane created successfully');
      await loadLists();

      // Reset Form fields that should clear
      setWeight('');
      setRate('');
      setComment('');
      setCommodity('');
      // We keep origin/dest/dates often for rapid entry, but let's clear them for "fresh" feel
      // or maybe just clear cities? User pref. Let's clear everything to be clean.
      setOrigin('');
      setDest('');
      // Dates usually stick in real brokerage apps, but for now reset.

    } catch (error) {
      toast.error(error.message || 'Failed to save lane');
    } finally {
      setBusy(false);
    }
  }

  async function createLaneFromData(laneData, authSession) {
    const payload = {
      origin_city: laneData.origin_city,
      origin_state: laneData.origin_state,
      origin_zip5: laneData.origin_zip,
      origin_zip: laneData.origin_zip ? laneData.origin_zip.slice(0, 3) : null,
      dest_city: laneData.dest_city,
      dest_state: laneData.dest_state,
      dest_zip5: laneData.dest_zip,
      dest_zip: laneData.dest_zip ? laneData.dest_zip.slice(0, 3) : null,
      equipment_code: laneData.equipment_code,
      length_ft: laneData.length_ft,
      full_partial: laneData.full_partial,
      pickup_earliest: laneData.pickup_earliest,
      pickup_latest: laneData.pickup_latest,
      randomize_weight: laneData.randomize_weight,
      weight_lbs: laneData.weight_lbs,
      weight_min: laneData.weight_min,
      weight_max: laneData.weight_max,
      rate: laneData.rate,
      randomize_rate: laneData.randomize_rate,
      rate_min: laneData.rate_min,
      rate_max: laneData.rate_max,
      comment: laneData.comment,
      commodity: laneData.commodity,
      pickup_time: laneData.pickup_time,
      delivery_time: laneData.delivery_time,
      temp: laneData.temp,
      email_notes: laneData.email_notes,
      lane_status: 'current',
      user_id: authSession.user.id,
      created_by: authSession.user.id
    };

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
    return await response.json();
  }

  // Handle Post Action
  async function handlePostLane(lane) {
    const loadingToast = toast.loading('Generating options...');
    try {
      await generateOptions(lane, (data) => {
        toast.success('Options generated!', { id: loadingToast });
      }, (err) => {
        toast.error(`Failed: ${err.message}`, { id: loadingToast });
      });
    } catch (error) {
      toast.error('Failed to post lane', { id: loadingToast });
    }
  }

  // Handle Archive/Delete/Restore
  async function handleLaneAction(lane, action) {
    if (!confirm(`Are you sure you want to ${action} this lane?`)) return;

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/lanes/${lane.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: action === 'delete' ? undefined : JSON.stringify({
          lane_status: action === 'archive' ? 'archive' : 'current'
        })
      });

      if (!response.ok) throw new Error('Action failed');
      toast.success(`Lane ${action}d successfully`);
      await loadLists();
    } catch (error) {
      toast.error(`Failed to ${action} lane`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit(updatedLane) {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const payload = {
        pickup_earliest: updatedLane.pickup_earliest,
        pickup_latest: updatedLane.pickup_latest,
        weight_lbs: updatedLane.weight_lbs,
        rate: updatedLane.rate,
        equipment_code: updatedLane.equipment_code,
        length_ft: updatedLane.length_ft,
        commodity: updatedLane.commodity,
        pickup_time: updatedLane.pickup_time,
        temp: updatedLane.temp,
        email_notes: updatedLane.email_notes
      };

      const response = await fetch(`/api/lanes/${updatedLane.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Update failed');

      toast.success('Lane updated');
      setShowEditModal(false);
      setEditingLane(null);
      await loadLists();
    } catch (err) {
      toast.error('Failed to update lane');
    } finally {
      setBusy(false);
    }
  }

  function toggleLaneSelection(laneId) {
    setSelectedLanes(prev =>
      prev.includes(laneId) ? prev.filter(id => id !== laneId) : [...prev, laneId]
    );
  }

  async function handleBulkDateUpdate() {
    if (!bulkDate) {
      toast.error('Please select a date');
      return;
    }
    if (selectedLanes.length === 0) return;

    setBusy(true);
    const loadingToast = toast.loading(`Updating ${selectedLanes.length} lanes...`);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();

      const updates = selectedLanes.map(id =>
        fetch(`/api/lanes/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`
          },
          body: JSON.stringify({ pickup_earliest: bulkDate, pickup_latest: bulkDate })
        })
      );

      await Promise.all(updates);
      toast.success(`Updated ${selectedLanes.length} lanes`, { id: loadingToast });
      setSelectedLanes([]);
      setBulkDate('');
      await loadLists();
    } catch (err) {
      toast.error('Bulk update failed', { id: loadingToast });
    } finally {
      setBusy(false);
    }
  }

  // --- Render Helpers ---

  function validate() {
    if (!origin || !dest) return 'Origin and Destination required';
    if (!equipment) return 'Equipment required';
    if (!pickupEarliest) return 'Pickup date required';
    return null;
  }

  function onPickOrigin(it) {
    setOrigin(`${it.city}, ${it.state}`);
    setOriginZip(it.zip || '');
  }

  function onPickDest(it) {
    setDest(`${it.city}, ${it.state}`);
    setDestZip(it.zip || '');
  }

  // Stats for Sidebar
  const stats = {
    postedLanes: current.length,
    failedLanes: 0,
    coveredLanes: 0
  };

  return (
    <DashboardLayout title="Lanes | RapidRoutes" stats={stats}>

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Lane Management
          </h1>
          <p className="text-secondary mt-1">Create and manage your freight lanes</p>
        </div>

        {/* Admin Lane Filter Toggle */}
        <div className="bg-white/5 p-1 rounded-lg border border-white/5 flex gap-1">
          <button
            onClick={() => setShowMyLanesOnly(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${showMyLanesOnly
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            My Lanes
          </button>
          <button
            onClick={() => setShowMyLanesOnly(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${!showMyLanesOnly
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            All RapidRoutes User Lanes
          </button>
        </div>
      </div>

      {/* Lane Constructor Panel - Premium Enterprise Interface */}
      <div className="mb-10 relative z-10">
        <div
          className="rounded-2xl border border-cyan-500/20 shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(10, 10, 14, 0.98) 100%)',
            backdropFilter: 'blur(30px)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.05)'
          }}
        >
          {/* Top Cyan Accent */}
          <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500/0 via-cyan-500 to-cyan-500/0 opacity-70" />

          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  ⚡
                </span>
                Lane Constructor
              </h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                  <input
                    type="checkbox"
                    checked={isPosted}
                    onChange={(e) => setIsPosted(e.target.checked)}
                    className="w-4 h-4 rounded border-cyan-500/30 bg-black/40 text-cyan-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-secondary group-hover:text-cyan-400 transition-colors uppercase tracking-wider">Auto-Post</span>
                </label>
              </div>
            </div>

            <form onSubmit={submitLane}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                {/* LEFT COLUMN - Core Route */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Origin & Destination Group */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-cyan-400/80 uppercase tracking-wider ml-1">Origin</label>
                      <div className="bg-black/30 p-1 rounded-xl border border-white/10 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
                        <GoogleCityAutocomplete
                          value={origin}
                          onChange={setOrigin}
                          onPick={onPickOrigin}
                          placeholder="City, ST"
                          className="w-full"
                          inputClassName="w-full bg-transparent border-none text-white text-lg font-bold placeholder:text-white/10 focus:ring-0 py-3 px-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-cyan-400/80 uppercase tracking-wider ml-1">Destination</label>
                      <div className="bg-black/30 p-1 rounded-xl border border-white/10 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
                        <GoogleCityAutocomplete
                          value={dest}
                          onChange={setDest}
                          onPick={onPickDest}
                          placeholder="City, ST"
                          className="w-full"
                          inputClassName="w-full bg-transparent border-none text-white text-lg font-bold placeholder:text-white/10 focus:ring-0 py-3 px-3"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Fields Group */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Equipment</label>
                      <div className="bg-black/30 rounded-xl border border-white/10 focus-within:border-cyan-500/50 transition-colors h-[50px] relative">
                        <EquipmentPicker
                          value={equipment}
                          onChange={setEquipment}
                          inputClassName="w-full h-full bg-transparent border-none text-white font-medium focus:ring-0 px-4 text-base"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Pickup Date</label>
                      <input
                        type="date"
                        value={pickupEarliest}
                        onChange={(e) => setPickupEarliest(e.target.value)}
                        className="w-full h-[50px] bg-black/30 rounded-xl border border-white/10 text-white px-4 focus:border-cyan-500/50 focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[1] [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 cursor-pointer"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Commodity</label>
                      <input
                        type="text"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        placeholder="General Freight"
                        className="w-full h-[50px] bg-black/30 rounded-xl border border-white/10 text-white px-4 focus:border-cyan-500/50 focus:ring-0 placeholder:text-white/10"
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-6">
                    <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest border-b border-purple-500/10 pb-2">Email-Only Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Pickup/Delivery Time</label>
                        <input
                          type="text"
                          value={pickupTime}
                          onChange={(e) => setPickupTime(e.target.value)}
                          placeholder="e.g. 08:00 - 16:00"
                          className="w-full h-[45px] bg-black/30 rounded-xl border border-white/10 text-white px-4 focus:border-purple-500/50 focus:ring-0 placeholder:text-white/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Temperature</label>
                        <input
                          type="text"
                          value={temp}
                          onChange={(e) => setTemp(e.target.value)}
                          placeholder="e.g. Maintain 34F"
                          className="w-full h-[45px] bg-black/30 rounded-xl border border-white/10 text-white px-4 focus:border-purple-500/50 focus:ring-0 placeholder:text-white/10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Email Notes (Public)</label>
                      <textarea
                        value={emailNotes}
                        onChange={(e) => setEmailNotes(e.target.value)}
                        placeholder="Additional details for emails only..."
                        rows={2}
                        className="w-full bg-black/30 rounded-xl border border-white/10 text-white px-4 py-3 focus:border-purple-500/50 focus:ring-0 placeholder:text-white/10 resize-none text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider ml-1">Internal Notes (Private)</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add notes about this lane..."
                      rows={2}
                      className="w-full bg-black/30 rounded-xl border border-white/10 text-white px-4 py-3 focus:border-cyan-500/50 focus:ring-0 placeholder:text-white/10 resize-none text-sm"
                    />
                  </div>
                </div>

                {/* RIGHT COLUMN - Stats & Actions */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  <div className="p-5 rounded-xl bg-white/5 border border-white/5 space-y-4">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-2 mb-2">Financials</h4>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs text-secondary">Rate</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={randomizeRate}
                              onChange={(e) => setRandomizeRate(e.target.checked)}
                              className="w-3 h-3 rounded border-white/20 bg-transparent text-cyan-500 focus:ring-0"
                            />
                            <span className="text-[10px] text-cyan-400/80 uppercase tracking-wider">Randomize</span>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="0.00"
                          disabled={randomizeRate}
                          className={`w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-emerald-500/50 focus:ring-0 font-mono text-right ${randomizeRate ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-xs text-secondary">Weight (lbs)</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={randomize}
                              onChange={(e) => setRandomize(e.target.checked)}
                              className="w-3 h-3 rounded border-white/20 bg-transparent text-cyan-500 focus:ring-0"
                            />
                            <span className="text-[10px] text-cyan-400/80 uppercase tracking-wider">Randomize</span>
                          </div>
                        </div>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="40000"
                          disabled={randomize}
                          className={`w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white focus:border-cyan-500/50 focus:ring-0 font-mono text-right ${randomize ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-400/20 transition-all active:scale-[0.98] uppercase tracking-widest text-sm flex items-center justify-center gap-3 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      {busy ? (
                        <span className="animate-pulse">Creating...</span>
                      ) : (
                        <>
                          <span>Create Lane</span>
                          <span className="text-xl group-hover:translate-x-1 transition-transform">➜</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedLanes.length > 0 && (
        <div className="sticky top-4 z-[60] mb-8 p-4 rounded-2xl bg-cyan-600 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-white text-sm font-bold">
              {selectedLanes.length} Lanes Selected
            </span>
            <button
              onClick={() => setSelectedLanes([])}
              className="text-white/80 hover:text-white text-xs font-semibold underline"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10">
              <label className="text-[10px] font-bold text-white/70 uppercase ml-2">Change Date For All:</label>
              <input
                type="date"
                className="bg-transparent border-none text-white text-sm focus:ring-0 cursor-pointer"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
              />
              <button
                onClick={handleBulkDateUpdate}
                disabled={busy || !bulkDate}
                className="px-4 py-1.5 rounded-lg bg-white text-cyan-700 text-xs font-bold hover:bg-cyan-50 transition-all disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lanes Grid */}
      <div className="mb-6">
        <div className="flex gap-6 border-b border-white/10 mb-6">
          <button
            className={`pb-2 px-1 text-sm font-medium transition-colors ${true ? 'text-primary border-b-2 border-primary' : 'text-secondary hover:text-white'
              }`}
          >
            Current Lanes <span className="ml-2 bg-white/10 px-2 py-0.5 rounded-full text-xs">{current.length}</span>
          </button>
        </div>

        {/* Lanes Grid - Premium Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {false ? ( // Assuming 'loading' state is managed elsewhere, using 'false' for now
            // Skeleton Loader
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))
          ) : (
            current.map(lane => ( // Using 'current' as per original logic
              <LaneCard
                key={lane.id}
                lane={lane}
                isSelected={selectedLanes.includes(lane.id)}
                onToggleSelect={toggleLaneSelection}
                onEdit={(l) => { setEditingLane(l); setShowEditModal(true); }}
                onDelete={(l) => handleLaneAction(l, 'delete')}
                onArchive={(l) => handleLaneAction(l, 'archive')}
                onRestore={(l) => handleLaneAction(l, 'restore')}
                onViewRoute={(l) => { setSelectedLaneForMap(l); setIsMapModalOpen(true); }}
                onPost={handlePostLane}
                isArchived={false}
              />
            ))
          )}
        </div>

        {current.length === 0 && (
          <div className="glass-card text-center py-16">
            <div className="text-4xl mb-4">🚛</div>
            <h3 className="text-xl font-semibold text-primary mb-2">No active lanes</h3>
            <p className="text-secondary max-w-md mx-auto">
              Create your first lane above to get started with automated posting and tracking.
            </p>
          </div>
        )}
      </div>

      {/* Archived Lanes */}
      {archive.length > 0 && (
        <div className="mt-12 pt-8 border-t border-white/5">
          <h3 className="text-lg font-bold text-secondary mb-6 uppercase tracking-wider text-xs">Archived Lanes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
            {archive.map(lane => (
              <LaneCard
                key={lane.id}
                lane={lane}
                isArchived={true}
                onRestore={(l) => handleLaneAction(l, 'restore')}
                onDelete={(l) => handleLaneAction(l, 'delete')}
                onViewRoute={(l) => { setSelectedLaneForMap(l); setIsMapModalOpen(true); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isMapModalOpen && selectedLaneForMap && (
        <RouteMapModal
          isOpen={isMapModalOpen}
          onClose={() => setIsMapModalOpen(false)}
          lane={selectedLaneForMap}
          origin={selectedLaneForMap.origin_city}
          dest={selectedLaneForMap.dest_city || selectedLaneForMap.destination_city}
        />
      )}

      {showEditModal && editingLane && (
        <EditLaneModal
          lane={editingLane}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
        />
      )}



    </DashboardLayout>
  );
}
