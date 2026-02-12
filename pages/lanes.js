// pages/lanes.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

// Components
import DashboardLayout from '../components/DashboardLayout';
import GoogleCityAutocomplete from '../components/GoogleCityAutocomplete.jsx';
import EquipmentPicker from '../components/EquipmentPicker.jsx';
import LaneCard from '../components/LaneCard.jsx';
import RouteMapModal from '../components/RouteMapModal.jsx';
// We'll use a simple inline modal for editing if one doesn't exist, 
// to avoid import errors. 
import AppBackground from '../components/ui/AppBackground';

import supabase from '../utils/supabaseClient';
import { getMyLanesOnlyPreference, setMyLanesOnlyPreference } from '../lib/laneFilterPreferences.js';
import { useAuth } from '../contexts/AuthContext';
import { generateOptions } from '../components/post-options/OptionsGenerator';
import { buildSmartSelectionIds, mapSelectionIdsToSavedCities } from '../lib/citySelection';

function toDateInputValue(value) {
  if (!value) return '';
  const raw = String(value);
  const isoDateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDateMatch) return isoDateMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCityState(city, state) {
  if (!city && !state) return '';
  if (!state) return String(city || '').trim();
  return `${String(city || '').trim()}, ${String(state || '').trim()}`;
}

function splitCityState(cityStateValue) {
  const value = String(cityStateValue || '').trim();
  if (!value) return { city: '', state: '' };
  const lastComma = value.lastIndexOf(',');
  if (lastComma === -1) return { city: value, state: '' };
  return {
    city: value.slice(0, lastComma).trim(),
    state: value.slice(lastComma + 1).trim()
  };
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildEditLaneForm(lane) {
  if (!lane) return null;

  return {
    id: lane.id,
    origin: formatCityState(lane.origin_city, lane.origin_state),
    originZip: lane.origin_zip5 || lane.origin_zip || '',
    originLatitude: lane.origin_latitude ?? null,
    originLongitude: lane.origin_longitude ?? null,
    dest: formatCityState(lane.dest_city || lane.destination_city, lane.dest_state || lane.destination_state),
    destZip: lane.dest_zip5 || lane.dest_zip || '',
    destLatitude: lane.dest_latitude ?? null,
    destLongitude: lane.dest_longitude ?? null,
    equipment: lane.equipment_code || '',
    pickupEarliest: toDateInputValue(lane.pickup_earliest),
    pickupLatest: toDateInputValue(lane.pickup_latest),
    randomizeWeight: !!lane.randomize_weight,
    weight: lane.weight_lbs ?? '',
    weightMin: lane.weight_min ?? '',
    weightMax: lane.weight_max ?? '',
    randomizeRate: !!lane.randomize_rate,
    rate: lane.rate ?? '',
    rateMin: lane.rate_min ?? '',
    rateMax: lane.rate_max ?? '',
    commodity: lane.commodity || '',
    comment: lane.comment || '',
    lengthFt: lane.length_ft ?? 48,
    fullPartial: lane.full_partial === 'partial' ? 'partial' : 'full'
  };
}

// --- Edit Lane Modal Component (Inline) ---
function EditLaneModal({ lane, isOpen, onClose, onSave }) {
  const [localLane, setLocalLane] = useState(() => buildEditLaneForm(lane));

  useEffect(() => {
    if (lane) {
      setLocalLane(buildEditLaneForm(lane));
    }
  }, [lane]);

  if (!isOpen || !lane || !localLane) return null;

  const handleChange = (field, value) => {
    setLocalLane(prev => ({ ...prev, [field]: value }));
  };

  const handleOriginChange = (value) => {
    setLocalLane((prev) => ({
      ...prev,
      origin: value,
      originLatitude: null,
      originLongitude: null
    }));
  };

  const handleDestChange = (value) => {
    setLocalLane((prev) => ({
      ...prev,
      dest: value,
      destLatitude: null,
      destLongitude: null
    }));
  };

  const handleOriginPick = (selected) => {
    setLocalLane((prev) => ({
      ...prev,
      origin: formatCityState(selected?.city, selected?.state),
      originZip: selected?.zip || prev.originZip || '',
      originLatitude: selected?.latitude ?? prev.originLatitude ?? null,
      originLongitude: selected?.longitude ?? prev.originLongitude ?? null
    }));
  };

  const handleDestPick = (selected) => {
    setLocalLane((prev) => ({
      ...prev,
      dest: formatCityState(selected?.city, selected?.state),
      destZip: selected?.zip || prev.destZip || '',
      destLatitude: selected?.latitude ?? prev.destLatitude ?? null,
      destLongitude: selected?.longitude ?? prev.destLongitude ?? null
    }));
  };

  return (
    <div className="lanes-modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit lane">
      <div className="lanes-modal-card rr-card-elevated lanes-edit-modal-card">
        <form onSubmit={(event) => {
          event.preventDefault();
          onSave(localLane);
        }}>
          <div className="card-header flex justify-between items-center">
            <h3>Edit Lane</h3>
            <button type="button" onClick={onClose} className="text-secondary hover:text-white" aria-label="Close edit lane modal">✕</button>
          </div>
          <div className="card-body lanes-edit-form">
            <div className="lanes-edit-route-grid">
              <div className="lanes-field">
                <label className="form-label section-header">Origin</label>
                <GoogleCityAutocomplete
                  value={localLane.origin}
                  onChange={handleOriginChange}
                  onPick={handleOriginPick}
                  placeholder="Origin city, ST"
                  className="w-full"
                  inputClassName="rr-input lanes-input lanes-city-modal-input"
                />
                <span className="lanes-edit-city-meta">{localLane.originZip ? `ZIP ${localLane.originZip}` : 'Search by city/state'}</span>
              </div>
              <div className="lanes-field">
                <label className="form-label section-header">Destination</label>
                <GoogleCityAutocomplete
                  value={localLane.dest}
                  onChange={handleDestChange}
                  onPick={handleDestPick}
                  placeholder="Destination city, ST"
                  className="w-full"
                  inputClassName="rr-input lanes-input lanes-city-modal-input"
                />
                <span className="lanes-edit-city-meta">{localLane.destZip ? `ZIP ${localLane.destZip}` : 'Search by city/state'}</span>
              </div>
            </div>

            <div className="lanes-edit-details-grid">
              <div className="lanes-field">
                <label className="form-label section-header">Equipment</label>
                <div className="lanes-input-shell">
                  <EquipmentPicker
                    label=""
                    code={localLane.equipment}
                    onChange={(value) => handleChange('equipment', value)}
                    inputClassName="rr-input lanes-input"
                  />
                </div>
              </div>

              <div className="lanes-field">
                <label className="form-label section-header">Pickup Date</label>
                <input
                  type="date"
                  className="rr-input lanes-input"
                  value={localLane.pickupEarliest}
                  onChange={(e) => handleChange('pickupEarliest', e.target.value)}
                  required
                />
              </div>

              <div className="lanes-field">
                <label className="form-label section-header">Latest Pickup Date</label>
                <input
                  type="date"
                  className="rr-input lanes-input"
                  value={localLane.pickupLatest}
                  onChange={(e) => handleChange('pickupLatest', e.target.value)}
                />
              </div>

              <div className="lanes-field">
                <label className="form-label section-header">Length (ft)</label>
                <input
                  type="number"
                  className="rr-input lanes-input"
                  value={localLane.lengthFt}
                  min="1"
                  onChange={(e) => handleChange('lengthFt', e.target.value)}
                />
              </div>

              <div className="lanes-field">
                <label className="form-label section-header">Full / Partial</label>
                <select
                  className="rr-input lanes-input"
                  value={localLane.fullPartial}
                  onChange={(e) => handleChange('fullPartial', e.target.value)}
                >
                  <option value="full">Full</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              <div className="lanes-field">
                <label className="form-label section-header">Commodity (Lane/CSV)</label>
                <input
                  type="text"
                  className="rr-input lanes-input"
                  value={localLane.commodity}
                  onChange={(e) => handleChange('commodity', e.target.value)}
                  placeholder="General Freight"
                />
              </div>
            </div>

            <div className="lanes-field">
              <label className="form-label section-header">Lane Comment (CSV)</label>
              <textarea
                className="rr-input lanes-textarea"
                rows={2}
                value={localLane.comment}
                onChange={(e) => handleChange('comment', e.target.value)}
                placeholder="Optional CSV/comment field for this lane..."
              />
            </div>

            <div className="lanes-edit-financial-grid">
              <div className="lanes-financial-field">
                <div className="lanes-financial-label-row">
                  <label className="form-label">Weight (lbs)</label>
                  <label className="lanes-randomize-toggle">
                    <input
                      type="checkbox"
                      checked={localLane.randomizeWeight}
                      onChange={(e) => handleChange('randomizeWeight', e.target.checked)}
                    />
                    <span>Randomize</span>
                  </label>
                </div>
                {localLane.randomizeWeight ? (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      className="rr-input lanes-input lanes-mono-input"
                      value={localLane.weightMin}
                      onChange={(e) => handleChange('weightMin', e.target.value)}
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      className="rr-input lanes-input lanes-mono-input"
                      value={localLane.weightMax}
                      onChange={(e) => handleChange('weightMax', e.target.value)}
                      placeholder="Max"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    className="rr-input lanes-input lanes-mono-input"
                    value={localLane.weight}
                    onChange={(e) => handleChange('weight', e.target.value)}
                    placeholder="40000"
                  />
                )}
              </div>

              <div className="lanes-financial-field">
                <div className="lanes-financial-label-row">
                  <label className="form-label">Rate</label>
                  <label className="lanes-randomize-toggle">
                    <input
                      type="checkbox"
                      checked={localLane.randomizeRate}
                      onChange={(e) => handleChange('randomizeRate', e.target.checked)}
                    />
                    <span>Randomize</span>
                  </label>
                </div>
                {localLane.randomizeRate ? (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      className="rr-input lanes-input lanes-mono-input"
                      value={localLane.rateMin}
                      onChange={(e) => handleChange('rateMin', e.target.value)}
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      className="rr-input lanes-input lanes-mono-input"
                      value={localLane.rateMax}
                      onChange={(e) => handleChange('rateMax', e.target.value)}
                      placeholder="Max"
                    />
                  </div>
                ) : (
                  <input
                    type="number"
                    className="rr-input lanes-input lanes-mono-input"
                    value={localLane.rate}
                    onChange={(e) => handleChange('rate', e.target.value)}
                    placeholder="0.00"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button type="button" onClick={onClose} className="rr-btn btn-outline">Cancel</button>
              <button type="submit" className="rr-btn rr-btn-primary">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CitySelectionModal({ target, value, onChange, onPick, onClose }) {
  if (!target) return null;

  const isOrigin = target === 'origin';
  const title = isOrigin ? 'Select Origin City' : 'Select Destination City';
  const placeholder = isOrigin ? 'Origin city, ST' : 'Destination city, ST';

  return (
    <div className="lanes-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="lanes-modal-card rr-card-elevated lanes-city-modal-card">
        <div className="card-header flex justify-between items-center">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-white" aria-label="Close city selector">✕</button>
        </div>
        <div className="card-body">
          <p className="text-secondary text-sm mb-4">
            Use city autocomplete and select the correct market. Existing lane logic is unchanged.
          </p>
          <GoogleCityAutocomplete
            value={value}
            onChange={onChange}
            onPick={(city) => {
              onPick(city);
              onClose();
            }}
            placeholder={placeholder}
            className="w-full"
            inputClassName="rr-input lanes-city-modal-input"
          />
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="rr-btn btn-outline">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LanesPage() {
  const router = useRouter();
  const { loading, isAuthenticated, profile } = useAuth(); // isAdmin removed if unused

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
  const [emailDetailsExpanded, setEmailDetailsExpanded] = useState(false);
  const [emailDetails, setEmailDetails] = useState({
    commodity: '',
    reeferTemperature: '',
    equipmentRequirements: '',
    pickupTime: '',
    deliveryTime: '',
    additionalInfo: '',
    internalNotes: ''
  });

  // Weight
  const [randomize, setRandomize] = useState(false);
  const [randMin, setRandMin] = useState('');
  const [randMax, setRandMax] = useState('');
  const [showWeightRandomModal, setShowWeightRandomModal] = useState(false);
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

  // Bulk Date Change State
  const [showBulkDateModal, setShowBulkDateModal] = useState(false);
  const [bulkSelectedLaneIds, setBulkSelectedLaneIds] = useState([]);
  const [bulkPickupDate, setBulkPickupDate] = useState('');
  const [bulkSetLatestForMissing, setBulkSetLatestForMissing] = useState(false);
  const [bulkLatestForMissing, setBulkLatestForMissing] = useState('');
  const [bulkDateBusy, setBulkDateBusy] = useState(false);

  const [cityModalTarget, setCityModalTarget] = useState(null);

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

  function updateEmailDetail(field, value) {
    setEmailDetails((prev) => ({ ...prev, [field]: value }));
  }

  function cacheLaneEmailDetails(laneId) {
    if (typeof window === 'undefined' || !laneId) return;

    const payload = {
      laneId,
      commodity: emailDetails.commodity || '',
      rate: rate || '',
      reeferTemperature: emailDetails.reeferTemperature || '',
      equipmentRequirements: emailDetails.equipmentRequirements || '',
      pickupTime: emailDetails.pickupTime || '',
      deliveryTime: emailDetails.deliveryTime || '',
      additionalInfo: emailDetails.additionalInfo || '',
      internalNotes: emailDetails.internalNotes || '',
      updatedAt: Date.now()
    };

    const hasAnyValue = Object.entries(payload).some(([key, value]) => {
      if (key === 'laneId' || key === 'updatedAt') return false;
      return String(value || '').trim().length > 0;
    });

    if (!hasAnyValue) return;

    try {
      const storageKey = 'rr:lane-email-details';
      const existingRaw = window.sessionStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      existing[String(laneId)] = payload;
      window.sessionStorage.setItem(storageKey, JSON.stringify(existing));
    } catch (error) {
      console.error('Failed to cache lane email details:', error);
    }
  }

  async function autoApplySmartSelections(lane) {
    const optionsResult = await generateOptions(lane);
    if (!optionsResult?.success || !optionsResult?.data) {
      throw new Error(optionsResult?.message || optionsResult?.error || 'Unable to generate post options');
    }

    const originOptions = Array.isArray(optionsResult.data.originOptions) ? optionsResult.data.originOptions : [];
    const destOptions = Array.isArray(optionsResult.data.destOptions) ? optionsResult.data.destOptions : [];

    const { originIds, destinationIds } = buildSmartSelectionIds(originOptions, destOptions);
    if (originIds.length === 0 || destinationIds.length === 0) {
      throw new Error('No smart city selections were available for this lane');
    }

    const originCities = mapSelectionIdsToSavedCities(originIds, originOptions);
    const destCities = mapSelectionIdsToSavedCities(destinationIds, destOptions);
    if (originCities.length === 0 || destCities.length === 0) {
      throw new Error('Unable to map smart city selections');
    }

    const saveResponse = await fetch('/api/save-city-selections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        laneId: lane.id,
        originCities,
        destCities
      })
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json().catch(() => ({}));
      throw new Error(errorData?.error || 'Failed to save smart city selections');
    }

    return await saveResponse.json();
  }

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
        pickup_latest: pickupLatest || null,
        randomize_weight: !!randomize,
        weight_lbs: randomize ? null : (weight === '' ? null : Number(weight)),
        weight_min: randomize ? (randMin === '' ? null : Number(randMin)) : null,
        weight_max: randomize ? (randMax === '' ? null : Number(randMax)) : null,
        rate: rate === '' ? null : Number(rate),
        randomize_rate: !!randomizeRate,
        rate_min: randomizeRate ? (randRateMin === '' ? null : Number(randRateMin)) : null,
        rate_max: randomizeRate ? (randRateMax === '' ? null : Number(randRateMax)) : null,
        comment: comment || null,
        commodity: commodity || null
      };

      const createdLane = await createLaneFromData(laneData, authSession);
      cacheLaneEmailDetails(createdLane?.id);

      if (isPosted) {
        const autopostToast = toast.loading('Auto-Post enabled: selecting best cities...');
        try {
          await autoApplySmartSelections(createdLane);
          toast.success('Lane created and city selection completed', { id: autopostToast });
        } catch (autoError) {
          toast.error(`Lane created, but Auto-Post failed: ${autoError.message}`, { id: autopostToast });
        }
      } else {
        toast.success('Lane created successfully');
      }

      await loadLists();

      // Reset Form fields that should clear
      setWeight('');
      setRate('');
      setComment('');
      setCommodity('');
      setEmailDetails({
        commodity: '',
        reeferTemperature: '',
        equipmentRequirements: '',
        pickupTime: '',
        deliveryTime: '',
        additionalInfo: '',
        internalNotes: ''
      });
      setEmailDetailsExpanded(false);
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

  function openBulkDateModal() {
    setBulkSelectedLaneIds([]);
    setBulkPickupDate('');
    setBulkSetLatestForMissing(false);
    setBulkLatestForMissing('');
    setShowBulkDateModal(true);
  }

  function closeBulkDateModal() {
    if (bulkDateBusy) return;
    setShowBulkDateModal(false);
  }

  function toggleBulkLaneSelection(laneId) {
    setBulkSelectedLaneIds((prev) => (
      prev.includes(laneId)
        ? prev.filter((id) => id !== laneId)
        : [...prev, laneId]
    ));
  }

  function selectAllBulkLanes() {
    setBulkSelectedLaneIds(current.map((lane) => lane.id));
  }

  function clearBulkLaneSelection() {
    setBulkSelectedLaneIds([]);
  }

  async function applyBulkDateChange() {
    if (!bulkPickupDate) {
      toast.error('Pickup date required');
      return;
    }
    if (bulkSelectedLaneIds.length === 0) {
      toast.error('Select at least one lane');
      return;
    }
    if (bulkSetLatestForMissing && !bulkLatestForMissing) {
      toast.error('Latest pickup date is required when enabled');
      return;
    }

    setBulkDateBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/lanes/bulk-date-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          laneIds: bulkSelectedLaneIds,
          pickup_earliest: bulkPickupDate,
          set_latest_for_missing: bulkSetLatestForMissing,
          latest_for_missing: bulkSetLatestForMissing ? bulkLatestForMissing : null
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update lane dates');
      }

      const updatedCount = Number(result?.updatedCount) || bulkSelectedLaneIds.length;
      toast.success(`Updated dates for ${updatedCount} lanes`);
      setShowBulkDateModal(false);
      setBulkSelectedLaneIds([]);
      setBulkPickupDate('');
      setBulkSetLatestForMissing(false);
      setBulkLatestForMissing('');
      await loadLists();
    } catch (error) {
      toast.error(error.message || 'Failed to update lane dates');
    } finally {
      setBulkDateBusy(false);
    }
  }

  async function handleSaveEdit(updatedLane) {
    const originParts = splitCityState(updatedLane.origin);
    const destinationParts = splitCityState(updatedLane.dest);
    if (!originParts.city || !originParts.state || !destinationParts.city || !destinationParts.state) {
      toast.error('Origin and Destination required');
      return;
    }
    if (!updatedLane.equipment) {
      toast.error('Equipment required');
      return;
    }
    if (!updatedLane.pickupEarliest) {
      toast.error('Pickup date required');
      return;
    }

    const weightLbs = updatedLane.randomizeWeight ? null : toNumberOrNull(updatedLane.weight);
    const weightMin = updatedLane.randomizeWeight ? toNumberOrNull(updatedLane.weightMin) : null;
    const weightMax = updatedLane.randomizeWeight ? toNumberOrNull(updatedLane.weightMax) : null;
    const rateValue = updatedLane.randomizeRate ? null : toNumberOrNull(updatedLane.rate);
    const rateMin = updatedLane.randomizeRate ? toNumberOrNull(updatedLane.rateMin) : null;
    const rateMax = updatedLane.randomizeRate ? toNumberOrNull(updatedLane.rateMax) : null;
    const lengthFtValue = toNumberOrNull(updatedLane.lengthFt);

    if (!updatedLane.randomizeWeight && weightLbs !== null && weightLbs <= 0) {
      toast.error('Weight must be greater than 0');
      return;
    }
    if (updatedLane.randomizeWeight && (weightMin !== null || weightMax !== null)) {
      if (weightMin === null || weightMax === null || weightMin <= 0 || weightMax <= 0 || weightMin > weightMax) {
        toast.error('Enter a valid weight range');
        return;
      }
    }
    if (!updatedLane.randomizeRate && rateValue !== null && rateValue < 0) {
      toast.error('Rate must be 0 or greater');
      return;
    }
    if (updatedLane.randomizeRate && (rateMin !== null || rateMax !== null)) {
      if (rateMin === null || rateMax === null || rateMin < 0 || rateMax < 0 || rateMin > rateMax) {
        toast.error('Enter a valid rate range');
        return;
      }
    }
    if (lengthFtValue !== null && lengthFtValue <= 0) {
      toast.error('Length must be greater than 0');
      return;
    }

    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const normalizedOriginZip = updatedLane.originZip ? String(updatedLane.originZip).trim().slice(0, 5) : null;
      const normalizedDestZip = updatedLane.destZip ? String(updatedLane.destZip).trim().slice(0, 5) : null;

      const payload = {
        origin_city: originParts.city,
        origin_state: originParts.state,
        origin_zip5: normalizedOriginZip,
        origin_zip: normalizedOriginZip ? normalizedOriginZip.slice(0, 3) : null,
        origin_latitude: updatedLane.originLatitude ?? null,
        origin_longitude: updatedLane.originLongitude ?? null,

        dest_city: destinationParts.city,
        dest_state: destinationParts.state,
        dest_zip5: normalizedDestZip,
        dest_zip: normalizedDestZip ? normalizedDestZip.slice(0, 3) : null,
        dest_latitude: updatedLane.destLatitude ?? null,
        dest_longitude: updatedLane.destLongitude ?? null,

        equipment_code: String(updatedLane.equipment || '').toUpperCase(),
        pickup_earliest: updatedLane.pickupEarliest,
        pickup_latest: updatedLane.pickupLatest || null,
        weight_lbs: weightLbs,
        weight_min: weightMin,
        weight_max: weightMax,
        randomize_weight: !!updatedLane.randomizeWeight,
        rate: rateValue,
        rate_min: rateMin,
        rate_max: rateMax,
        randomize_rate: !!updatedLane.randomizeRate,
        commodity: updatedLane.commodity || null,
        comment: updatedLane.comment || null,
        full_partial: updatedLane.fullPartial === 'partial' ? 'partial' : 'full',
        length_ft: lengthFtValue
      };

      const response = await fetch(`/api/lanes/${updatedLane.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || 'Update failed');

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

  function handleRandomizeWeightToggle(checked) {
    setRandomize(checked);
    if (checked) {
      setShowWeightRandomModal(true);
    }
  }

  function cancelRandomizeWeight() {
    setShowWeightRandomModal(false);
    setRandomize(false);
  }

  function applyRandomizedWeight() {
    const min = Number(randMin);
    const max = Number(randMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || min > max) {
      toast.error('Enter valid min/max weight bounds');
      return;
    }

    const randomValue = Math.floor(Math.random() * (max - min + 1)) + min;
    setWeight(String(randomValue));
    setShowWeightRandomModal(false);
    setRandomize(false);
    toast.success(`Weight randomized to ${randomValue.toLocaleString()} lbs`);
  }

  // Stats for Sidebar
  const stats = {
    postedLanes: current.length,
    failedLanes: 0,
    coveredLanes: 0
  };

  return (
    <AppBackground>
      <DashboardLayout title="Lanes | RapidRoutes" stats={stats}>
        <section className="lanes-page">
          <header className="lanes-toolbar">
            <div className="lanes-toolbar-copy">
              <h1 className="lanes-title">Lane Management</h1>
              <p className="lanes-subtitle">Create and manage your freight lanes</p>
            </div>

            <div className="lanes-visibility-toggle rr-card">
              <button
                type="button"
                onClick={() => setShowMyLanesOnly(true)}
                className={`lanes-toggle-btn ${showMyLanesOnly ? 'active' : ''}`}
              >
                My Lanes
              </button>
              <button
                type="button"
                onClick={() => setShowMyLanesOnly(false)}
                className={`lanes-toggle-btn ${!showMyLanesOnly ? 'active' : ''}`}
              >
                All RapidRoutes User Lanes
              </button>
            </div>
          </header>

          <section className="lanes-constructor rr-card-elevated">
            <div className="lanes-constructor-accent" />
            <div className="lanes-constructor-inner">
              <div className="lanes-constructor-header">
                <h2 className="lanes-constructor-title">
                  <span className="lanes-constructor-icon" aria-hidden="true">⚡</span>
                  Lane Constructor
                </h2>
                <label className="lanes-autopost-toggle">
                  <input
                    type="checkbox"
                    checked={isPosted}
                    onChange={(e) => setIsPosted(e.target.checked)}
                  />
                  <span>Auto-Post</span>
                </label>
              </div>

              <form onSubmit={submitLane}>
                <div className="lanes-constructor-grid">
                  <div className="lanes-core-column">
                    <div className="lanes-route-grid">
                      <div className="lanes-field">
                        <label className="form-label section-header">Origin</label>
                        <button
                          type="button"
                          className="lanes-city-trigger"
                          onClick={() => setCityModalTarget('origin')}
                          aria-label="Select origin city"
                        >
                          <span className={`lanes-city-value ${origin ? '' : 'lanes-city-placeholder'}`}>
                            {origin || 'Select origin city'}
                          </span>
                          <span className="lanes-city-meta">
                            {originZip ? `ZIP ${originZip}` : 'Search by city/state'}
                          </span>
                        </button>
                      </div>

                      <div className="lanes-field">
                        <label className="form-label section-header">Destination</label>
                        <button
                          type="button"
                          className="lanes-city-trigger"
                          onClick={() => setCityModalTarget('dest')}
                          aria-label="Select destination city"
                        >
                          <span className={`lanes-city-value ${dest ? '' : 'lanes-city-placeholder'}`}>
                            {dest || 'Select destination city'}
                          </span>
                          <span className="lanes-city-meta">
                            {destZip ? `ZIP ${destZip}` : 'Search by city/state'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="lanes-details-grid">
                      <div className="lanes-field">
                        <label className="form-label section-header">Equipment</label>
                        <div className="lanes-input-shell">
                          <EquipmentPicker
                            label=""
                            code={equipment}
                            onChange={setEquipment}
                            inputClassName="rr-input lanes-input"
                          />
                        </div>
                      </div>

                      <div className="lanes-field">
                        <label className="form-label section-header">Pickup Date</label>
                        <input
                          type="date"
                          value={pickupEarliest}
                          onChange={(e) => setPickupEarliest(e.target.value)}
                          className="rr-input lanes-input"
                          required
                        />
                      </div>

                      <div className="lanes-field">
                        <label className="form-label section-header">Latest Pickup Date</label>
                        <input
                          type="date"
                          value={pickupLatest}
                          onChange={(e) => setPickupLatest(e.target.value)}
                          className="rr-input lanes-input"
                        />
                      </div>

                      <div className="lanes-field">
                        <label className="form-label section-header">Commodity (Lane/CSV)</label>
                        <input
                          type="text"
                          value={commodity}
                          onChange={(e) => setCommodity(e.target.value)}
                          placeholder="General Freight"
                          className="rr-input lanes-input"
                          aria-label="Lane commodity"
                        />
                      </div>
                    </div>

                    <div className="lanes-field">
                      <label className="form-label section-header">Lane Comment (CSV)</label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Optional CSV/comment field for this lane..."
                        rows={2}
                        className="rr-input lanes-textarea"
                      />
                    </div>

                    <div className="lanes-email-details rr-card">
                      <button
                        type="button"
                        onClick={() => setEmailDetailsExpanded((prev) => !prev)}
                        className="lanes-email-toggle"
                        aria-expanded={emailDetailsExpanded}
                      >
                        <span>Email Details (Optional)</span>
                        <span>{emailDetailsExpanded ? '-' : '+'}</span>
                      </button>

                      {emailDetailsExpanded && (
                        <div className="lanes-email-body">
                          <div className="lanes-email-grid">
                            <div className="lanes-field">
                              <label className="form-label section-header">Commodity (Email Only)</label>
                              <input
                                type="text"
                                value={emailDetails.commodity}
                                onChange={(e) => updateEmailDetail('commodity', e.target.value)}
                                placeholder="General Freight"
                                className="rr-input lanes-input"
                                aria-label="Email commodity"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Reefer Temperature (F)</label>
                              <input
                                type="number"
                                value={emailDetails.reeferTemperature}
                                onChange={(e) => updateEmailDetail('reeferTemperature', e.target.value)}
                                placeholder="e.g. 34"
                                className="rr-input lanes-input"
                                aria-label="Reefer temperature"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Rate (Mirrors Financials)</label>
                              <input
                                type="text"
                                value={rate || ''}
                                placeholder="Set rate in Financials panel"
                                className="rr-input lanes-input lanes-disabled-input"
                                readOnly
                                aria-label="Rate mirror"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Equipment Requirements</label>
                              <input
                                type="text"
                                value={emailDetails.equipmentRequirements}
                                onChange={(e) => updateEmailDetail('equipmentRequirements', e.target.value)}
                                placeholder="Tarps, straps, team, etc."
                                className="rr-input lanes-input"
                                aria-label="Equipment requirements"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Pickup Time</label>
                              <input
                                type="text"
                                value={emailDetails.pickupTime}
                                onChange={(e) => updateEmailDetail('pickupTime', e.target.value)}
                                placeholder="8:00 AM - 12:00 PM"
                                className="rr-input lanes-input"
                                aria-label="Pickup time"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Delivery Time</label>
                              <input
                                type="text"
                                value={emailDetails.deliveryTime}
                                onChange={(e) => updateEmailDetail('deliveryTime', e.target.value)}
                                placeholder="1:00 PM - 5:00 PM"
                                className="rr-input lanes-input"
                                aria-label="Delivery time"
                              />
                            </div>
                          </div>

                          <div className="lanes-email-grid lanes-email-grid-textarea">
                            <div className="lanes-field">
                              <label className="form-label section-header">Additional Info</label>
                              <textarea
                                value={emailDetails.additionalInfo}
                                onChange={(e) => updateEmailDetail('additionalInfo', e.target.value)}
                                placeholder="Extra email-only shipment details..."
                                rows={2}
                                className="rr-input lanes-textarea"
                              />
                            </div>

                            <div className="lanes-field">
                              <label className="form-label section-header">Internal Notes</label>
                              <textarea
                                value={emailDetails.internalNotes}
                                onChange={(e) => updateEmailDetail('internalNotes', e.target.value)}
                                placeholder="Internal email-only notes..."
                                rows={2}
                                className="rr-input lanes-textarea"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="lanes-financial-column">
                    <div className="lanes-financial-card rr-card">
                      <h3 className="section-header lanes-financial-title">Financials</h3>

                      <div className="lanes-financial-field">
                        <div className="lanes-financial-label-row">
                          <label className="form-label">Rate</label>
                          <label className="lanes-randomize-toggle">
                            <input
                              type="checkbox"
                              checked={randomizeRate}
                              onChange={(e) => setRandomizeRate(e.target.checked)}
                            />
                            <span>Randomize</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          value={rate}
                          onChange={(e) => setRate(e.target.value)}
                          placeholder="0.00"
                          disabled={randomizeRate}
                          className={`rr-input lanes-input lanes-mono-input ${randomizeRate ? 'lanes-disabled-input' : ''}`}
                          aria-label="Rate"
                        />
                      </div>

                      <div className="lanes-financial-field">
                        <div className="lanes-financial-label-row">
                          <label className="form-label">Weight (lbs)</label>
                          <label className="lanes-randomize-toggle">
                            <input
                              type="checkbox"
                              checked={randomize}
                              onChange={(e) => handleRandomizeWeightToggle(e.target.checked)}
                            />
                            <span>Randomize</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          placeholder="40000"
                          disabled={randomize}
                          className={`rr-input lanes-input lanes-mono-input ${randomize ? 'lanes-disabled-input' : ''}`}
                          aria-label="Weight in pounds"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="rr-btn rr-btn-primary lanes-submit-btn"
                    >
                      {busy ? 'Creating...' : 'Create Lane'}
                    </button>
                  </aside>
                </div>
              </form>
            </div>
          </section>

          <section className="lanes-list-section">
            <div className="lanes-list-toolbar">
              <button type="button" className="lanes-list-tab active">
                Current Lanes
                <span className="lanes-list-count">{current.length}</span>
              </button>
              <div className="lanes-list-actions">
                <button
                  type="button"
                  onClick={openBulkDateModal}
                  className="rr-btn btn-outline lanes-date-change-btn"
                  disabled={current.length === 0 || bulkDateBusy}
                >
                  Change Lane Date
                </button>
              </div>
            </div>

            <div className="lanes-list-grid">
              {current.map((lane) => (
                <LaneCard
                  key={lane.id}
                  lane={lane}
                  onEdit={(l) => { setEditingLane(l); setShowEditModal(true); }}
                  onDelete={(l) => handleLaneAction(l, 'delete')}
                  onArchive={(l) => handleLaneAction(l, 'archive')}
                  onRestore={(l) => handleLaneAction(l, 'restore')}
                  onViewRoute={(l) => { setSelectedLaneForMap(l); setIsMapModalOpen(true); }}
                  onPost={handlePostLane}
                  isArchived={false}
                  onLaneUpdated={(updatedLane) => {
                    setCurrent((prev) => prev.map((item) => (item.id === updatedLane.id ? { ...item, ...updatedLane } : item)));
                  }}
                />
              ))}
            </div>

            {current.length === 0 && (
              <div className="lanes-empty-state rr-card">
                <div className="lanes-empty-icon">🚛</div>
                <h3>No active lanes</h3>
                <p>Create your first lane above to get started with automated posting and tracking.</p>
              </div>
            )}
          </section>

          {archive.length > 0 && (
            <section className="lanes-archive-section">
              <h3 className="section-header">Archived Lanes</h3>
              <div className="lanes-archive-grid">
                {archive.map((lane) => (
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
            </section>
          )}

          {isMapModalOpen && selectedLaneForMap && (
            <RouteMapModal
              isOpen={isMapModalOpen}
              onClose={() => setIsMapModalOpen(false)}
              lane={selectedLaneForMap}
              origin={selectedLaneForMap.origin_city}
              dest={selectedLaneForMap.dest_city || selectedLaneForMap.destination_city}
            />
          )}

          {showBulkDateModal && (
            <div className="lanes-modal-backdrop" role="dialog" aria-modal="true" aria-label="Bulk change lane date">
              <div className="lanes-modal-card rr-card-elevated lanes-bulk-date-modal-card">
                <div className="card-header flex justify-between items-center">
                  <div>
                    <h3>Change Lane Date</h3>
                    <p className="text-secondary text-xs mt-1">Update pickup dates for selected visible lanes in one submit.</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeBulkDateModal}
                    className="text-secondary hover:text-white"
                    aria-label="Close bulk date modal"
                    disabled={bulkDateBusy}
                  >
                    ✕
                  </button>
                </div>
                <div className="card-body">
                  <p className="lanes-bulk-helper">
                    Lanes with an existing latest pickup date keep their original date span automatically.
                  </p>

                  <div className="lanes-bulk-controls">
                    <span className="text-sm text-secondary">{bulkSelectedLaneIds.length} selected</span>
                    <div className="flex gap-2">
                      <button type="button" className="rr-btn btn-outline" onClick={selectAllBulkLanes} disabled={current.length === 0 || bulkDateBusy}>Select All</button>
                      <button type="button" className="rr-btn btn-outline" onClick={clearBulkLaneSelection} disabled={bulkDateBusy}>Clear</button>
                    </div>
                  </div>

                  <div className="lanes-bulk-list">
                    {current.map((lane) => {
                      const laneDateLabel = lane.pickup_latest && lane.pickup_latest !== lane.pickup_earliest
                        ? `${toDateInputValue(lane.pickup_earliest)} → ${toDateInputValue(lane.pickup_latest)}`
                        : toDateInputValue(lane.pickup_earliest) || 'No pickup date';

                      return (
                        <label key={lane.id} className="lanes-bulk-lane-row">
                          <input
                            type="checkbox"
                            checked={bulkSelectedLaneIds.includes(lane.id)}
                            onChange={() => toggleBulkLaneSelection(lane.id)}
                            disabled={bulkDateBusy}
                          />
                          <span className="lanes-bulk-lane-main">
                            <span className="lanes-bulk-lane-route">
                              {lane.origin_city}, {lane.origin_state} → {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
                            </span>
                            <span className="lanes-bulk-lane-meta">{laneDateLabel}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="lanes-bulk-date-grid">
                    <div className="lanes-field">
                      <label className="form-label section-header">New Pickup Date</label>
                      <input
                        type="date"
                        className="rr-input lanes-input"
                        value={bulkPickupDate}
                        onChange={(e) => setBulkPickupDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="lanes-field">
                      <label className="lanes-randomize-toggle lanes-inline-toggle">
                        <input
                          type="checkbox"
                          checked={bulkSetLatestForMissing}
                          onChange={(e) => setBulkSetLatestForMissing(e.target.checked)}
                          disabled={bulkDateBusy}
                        />
                        <span>Set latest pickup date for lanes with none</span>
                      </label>
                      {bulkSetLatestForMissing && (
                        <input
                          type="date"
                          className="rr-input lanes-input"
                          value={bulkLatestForMissing}
                          onChange={(e) => setBulkLatestForMissing(e.target.value)}
                          required
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={closeBulkDateModal} className="rr-btn btn-outline" disabled={bulkDateBusy}>Cancel</button>
                    <button type="button" onClick={applyBulkDateChange} className="rr-btn rr-btn-primary" disabled={bulkDateBusy}>
                      {bulkDateBusy ? 'Applying...' : 'Apply to Selected Lanes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showEditModal && editingLane && (
            <EditLaneModal
              lane={editingLane}
              isOpen={showEditModal}
              onClose={() => { setShowEditModal(false); setEditingLane(null); }}
              onSave={handleSaveEdit}
            />
          )}

          <CitySelectionModal
            target={cityModalTarget}
            value={cityModalTarget === 'origin' ? origin : dest}
            onChange={cityModalTarget === 'origin' ? setOrigin : setDest}
            onPick={cityModalTarget === 'origin' ? onPickOrigin : onPickDest}
            onClose={() => setCityModalTarget(null)}
          />

          {showWeightRandomModal && (
            <div className="lanes-modal-backdrop">
              <div className="lanes-modal-card rr-card-elevated lanes-weight-modal-card">
                <div className="card-header flex justify-between items-center">
                  <h3>Randomize Weight</h3>
                  <button type="button" onClick={cancelRandomizeWeight} className="text-secondary hover:text-white" aria-label="Close randomize weight modal">✕</button>
                </div>
                <div className="card-body">
                  <p className="text-secondary text-sm mb-4">Enter low/high bounds (lbs), then apply a random integer weight.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Low</label>
                      <input
                        type="number"
                        className="form-input"
                        value={randMin}
                        onChange={(e) => setRandMin(e.target.value)}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <label className="form-label">High</label>
                      <input
                        type="number"
                        className="form-input"
                        value={randMax}
                        onChange={(e) => setRandMax(e.target.value)}
                        placeholder="45000"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={cancelRandomizeWeight} className="rr-btn btn-outline">Cancel</button>
                    <button type="button" onClick={applyRandomizedWeight} className="rr-btn rr-btn-primary">Apply Weight</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </DashboardLayout>
    </AppBackground>
  );
}

// EMERGENCY HOTFIX MANUAL TESTS (Lanes):
// 1) Equipment dropdown: open Equipment field, verify full trailer list is available (Dry Van/Reefer/Flatbed/Step Deck/Conestoga/Power Only/Hotshot/Box Truck/Sprinter, etc), create lane, and confirm save succeeds.
// 2) Randomize Weight popup: check Randomize under Weight, verify low/high popup appears; enter bounds (e.g., 12000-22000), click Apply Weight, and confirm Weight field is set to an integer within range.
// 3) Latest Pickup Date: set Pickup Date=today and Latest Pickup Date=tomorrow, create lane, and verify pickup_earliest/pickup_latest persist on reload and are returned in lane payload.
// 4) API/Supabase errors: create lane and confirm browser console has no new 400s for rest/v1/lanes and /api/lanes returns success (200/201) with a lane object.
