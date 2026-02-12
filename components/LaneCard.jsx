import React, { useEffect, useState } from 'react';
import { distanceInMiles } from '../utils/haversine';
import { generateOptions } from './post-options/OptionsGenerator';
import OptionsDisplay from './post-options/OptionsDisplay';

function extractSavedSelections(laneData) {
  const origins = Array.isArray(laneData?.saved_origin_cities)
    ? laneData.saved_origin_cities
    : Array.isArray(laneData?.saved_origins)
      ? laneData.saved_origins
      : Array.isArray(laneData?.origin_cities)
        ? laneData.origin_cities
        : [];

  const destinations = Array.isArray(laneData?.saved_dest_cities)
    ? laneData.saved_dest_cities
    : Array.isArray(laneData?.saved_dests)
      ? laneData.saved_dests
      : Array.isArray(laneData?.dest_cities)
        ? laneData.dest_cities
        : [];

  return { origins, destinations };
}

export default function LaneCard({ lane, onEdit, onDelete, onArchive, onRestore, onViewRoute, onPost, isArchived, onLaneUpdated }) {
  const [isPostOptionsOpen, setIsPostOptionsOpen] = useState(false);
  const [postOptions, setPostOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectionDraft, setSelectionDraft] = useState(null);
  const [savedSelections, setSavedSelections] = useState(() => extractSavedSelections(lane));

  useEffect(() => {
    setSavedSelections(extractSavedSelections(lane));
    setSelectionDraft(null);
    setIsPostOptionsOpen(false);
  }, [lane]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateRPM = () => {
    try {
      if (!lane.rate || lane.rate <= 0) return null;
      if (lane.origin_latitude && lane.origin_longitude && lane.dest_latitude && lane.dest_longitude) {
        const dist = distanceInMiles(
          { lat: lane.origin_latitude, lon: lane.origin_longitude },
          { lat: lane.dest_latitude, lon: lane.dest_longitude }
        );
        const estRoadDist = dist * 1.2;
        if (estRoadDist > 0) return (lane.rate / estRoadDist).toFixed(2);
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  const estRPM = calculateRPM();
  const pickupDisplay = lane.pickup_latest && lane.pickup_latest !== lane.pickup_earliest
    ? `${formatDate(lane.pickup_earliest)} - ${formatDate(lane.pickup_latest)}`
    : formatDate(lane.pickup_earliest);
  const hasSavedChoices = savedSelections.origins.length > 0 && savedSelections.destinations.length > 0;

  const handlePostOptionsClick = async (e) => {
    e.stopPropagation();

    if (isPostOptionsOpen) {
      setIsPostOptionsOpen(false);
      return;
    }

    setIsPostOptionsOpen(true);
    if (postOptions) return;

    setLoadingOptions(true);
    try {
      const result = await generateOptions(lane);
      if (!result?.success || !result?.data) {
        throw new Error(result?.message || result?.error || 'Failed to generate options');
      }
      setPostOptions(result.data);
    } catch (error) {
      console.error('Post options error', error);
      setIsPostOptionsOpen(false);
      onPost(lane);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSaveSelectionsSuccess = (updatedLane, nextSelectionState) => {
    if (updatedLane) {
      setSavedSelections(extractSavedSelections(updatedLane));
      if (typeof onLaneUpdated === 'function') {
        onLaneUpdated(updatedLane);
      }
    }

    setSelectionDraft({
      origins: nextSelectionState?.origins || [],
      destinations: nextSelectionState?.destinations || []
    });
    setIsPostOptionsOpen(false);
  };

  const optionsLanePayload = {
    ...lane,
    saved_origin_cities: savedSelections.origins,
    saved_dest_cities: savedSelections.destinations
  };

  const totalSavedPairs = Math.min(savedSelections.origins.length, savedSelections.destinations.length);
  const selectionSummaryText = hasSavedChoices
    ? `${totalSavedPairs} saved pair${totalSavedPairs === 1 ? '' : 's'}`
    : 'No city selections saved yet';

  return (
    <>
      <div
        className={`lane-card group relative transition-all duration-300 ${isPostOptionsOpen ? 'lane-card-expanded' : 'lane-card-hover'}`}
      >
        <div className={`lane-card-accent absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent transition-opacity ${isPostOptionsOpen ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />

        <div className="p-5">
          <div className="flex justify-between items-start mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                  {lane.origin_city}, {lane.origin_state}
                </span>
                <span className="text-cyan-400 text-xl">→</span>
                <span className="text-lg font-bold text-white tracking-tight drop-shadow-md">
                  {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-500/35 text-cyan-100 border border-cyan-300/45 uppercase tracking-wider">
                  {lane.equipment_code}
                </span>
                <span className="text-xs text-slate-100 font-medium">{lane.length_ft}ft</span>
                {lane.full_partial === 'partial' && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-500/35 text-violet-100 border border-violet-300/45 uppercase tracking-wider">
                    Partial
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${hasSavedChoices ? 'bg-emerald-500/35 text-emerald-100 border-emerald-300/45' : 'bg-amber-500/35 text-amber-100 border-amber-300/45'}`}>
                  {hasSavedChoices ? 'City Selection Complete' : 'City Selection Required'}
                </span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Active" />
              {lane.rate > 0 && <div className="w-2 h-2 rounded-full bg-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.5)]" title="Rated" />}
            </div>
          </div>

          <div className="lane-card-stats grid grid-cols-2 gap-3 mb-5 p-3 rounded-lg bg-slate-900/42 border border-slate-300/35">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-200 font-semibold mb-1">Pickup Date</div>
              <div className="text-sm font-medium text-white flex items-center gap-2">
                <span className="text-cyan-300">📅</span>
                {pickupDisplay}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-200 font-semibold mb-1">Target Rate</div>
              <div className="text-lg font-bold text-emerald-300 leading-none">
                {lane.rate > 0 ? `$${lane.rate.toLocaleString()}` : <span className="text-sm text-slate-200 italic font-normal">Open</span>}
              </div>
              {estRPM && (
                <div className="text-[10px] text-slate-200 mt-0.5">
                  ${estRPM}/mi (est)
                </div>
              )}
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-300/35 flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-200 font-semibold">Weight</div>
                <div className="text-sm font-medium text-white">{lane.weight_lbs ? `${(lane.weight_lbs / 1000).toFixed(0)}k lbs` : '—'}</div>
                <div className="text-[10px] text-slate-200 mt-1">{selectionSummaryText}</div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewRoute(lane); }}
                className="text-xs text-cyan-200 hover:text-cyan-100 font-medium flex items-center gap-1 transition-colors"
              >
                View Map 🗺️
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isArchived ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRestore(lane); }}
                className="flex-1 py-1.5 rounded-lg bg-slate-900/42 hover:bg-slate-800/45 text-white text-xs font-semibold border border-slate-300/35 transition-all"
              >
                Restore Lane
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePostOptionsClick}
                  disabled={loadingOptions}
                  className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-cyan-900/40 border border-cyan-300/45 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loadingOptions ? (
                    <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  ) : (
                    <>
                      <span className="text-sm">🚀</span> Post Options
                    </>
                  )}
                </button>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(lane); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900/42 hover:bg-slate-800/45 text-slate-100 border border-slate-300/35 transition-colors"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onArchive(lane); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900/42 hover:bg-slate-800/45 text-slate-100 border border-slate-300/35 transition-colors"
                    title="Archive"
                  >
                    📦
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(lane); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/35 hover:bg-red-500/45 text-red-100 border border-red-300/45 transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isPostOptionsOpen && (
        <div className="lanes-modal-backdrop" role="dialog" aria-modal="true" aria-label="Post options city selection">
          <div className="lanes-modal-card rr-card-elevated lanes-post-options-modal-card">
            <div className="card-header flex justify-between items-center">
              <div>
                <h3 className="text-white">Post Options</h3>
                <p className="text-xs text-slate-200 mt-1">
                  {lane.origin_city}, {lane.origin_state} → {lane.dest_city || lane.destination_city}, {lane.dest_state || lane.destination_state}
                </p>
              </div>
              <button type="button" onClick={() => setIsPostOptionsOpen(false)} className="text-secondary hover:text-white" aria-label="Close post options modal">✕</button>
            </div>
            <div className="card-body">
              {loadingOptions ? (
                <div className="flex items-center justify-center py-14">
                  <span className="animate-spin h-7 w-7 border-2 border-slate-200/35 border-t-white rounded-full" />
                </div>
              ) : (
                <OptionsDisplay
                  laneId={lane.id}
                  lane={optionsLanePayload}
                  originOptions={postOptions?.originOptions || []}
                  destOptions={postOptions?.destOptions || []}
                  initialSelections={selectionDraft}
                  onSelectionChange={(next) => setSelectionDraft({ origins: next.origins, destinations: next.destinations })}
                  onSaveSuccess={handleSaveSelectionsSuccess}
                  saveButtonLabel="Save Selections & Done"
                />
              )}
            </div>
            <div className="flex justify-end px-6 pb-6">
              <button type="button" onClick={() => setIsPostOptionsOpen(false)} className="rr-btn btn-outline">Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
